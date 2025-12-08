# @rodrigogs/mysql-events - Giải thích cách hoạt động

## Tổng quan

Thư viện `@rodrigogs/mysql-events` bao gồm 2 package chính:

1. **@rodrigogs/mysql-events** - High-level API để lắng nghe và xử lý các sự kiện thay đổi dữ liệu từ MySQL
2. **@rodrigogs/zongji** - Low-level library để parse MySQL binary log (binlog)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Code                            │
│                   (addTrigger, onEvent...)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    @rodrigogs/mysql-events                       │
│  - MySQLEvents class (EventEmitter)                              │
│  - Trigger management (addTrigger/removeTrigger)                 │
│  - Event normalization & filtering                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      @rodrigogs/zongji                           │
│  - MySQL binlog protocol implementation                          │
│  - Binary log parsing                                            │
│  - Table mapping & column metadata                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MySQL Server                                 │
│  - Binary Log (binlog)                                           │
│  - Replication Protocol                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. MySQL Binary Log (Binlog)

### Binlog là gì?

Binary Log là một file log của MySQL chứa tất cả các sự kiện thay đổi dữ liệu (INSERT, UPDATE, DELETE). Nó được sử dụng chủ yếu cho:
- **Replication**: Sao chép dữ liệu từ master sang slave
- **Point-in-time recovery**: Phục hồi dữ liệu đến một thời điểm cụ thể

### Cấu hình MySQL để bật Binlog

```ini
# my.cnf
server-id        = 1
binlog_format    = row        # QUAN TRỌNG: phải là 'row'
log_bin          = /var/log/mysql/mysql-bin.log
```

### Quyền hạn cần thiết

```sql
GRANT REPLICATION SLAVE, REPLICATION CLIENT, SELECT ON *.* TO 'user'@'localhost'
```

---

## 2. ZongJi - Low-level Binlog Parser

### Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                         ZongJi                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ ctrlConnection│  │  connection  │  │     tableMap         │   │
│  │ (query info) │  │ (binlog read)│  │ (cache table schema) │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                 Binlog Sequence                              │ │
│  │  - Parse binlog packets                                      │ │
│  │  - Decode events (TableMap, WriteRows, UpdateRows, etc.)     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Quy trình hoạt động của ZongJi

```javascript
// 1. Khởi tạo
const zongji = new ZongJi(connectionConfig);

// 2. ZongJi tạo 2 connections:
//    - ctrlConnection: để query thông tin bảng (information_schema)
//    - connection: để đọc binlog stream

// 3. Kiểm tra checksum
// SELECT @@GLOBAL.binlog_checksum as checksum

// 4. Tìm vị trí binlog cuối (nếu startAtEnd = true)
// SHOW BINARY LOGS

// 5. Bắt đầu đọc binlog
zongji.start({
  includeEvents: ['tablemap', 'writerows', 'updaterows', 'deleterows']
});
```

### Các loại Binlog Events

| Event | Mô tả |
|-------|-------|
| `tablemap` | Mô tả cấu trúc bảng, gửi trước mỗi row event |
| `writerows` | Dữ liệu được INSERT |
| `updaterows` | Dữ liệu được UPDATE (có before/after) |
| `deleterows` | Dữ liệu được DELETE |
| `rotate` | Chuyển sang binlog file mới |
| `query` | SQL query (DDL statements) |
| `xid` | Transaction ID (COMMIT) |

### Cách ZongJi parse TableMap Event

```javascript
// Khi nhận được TableMap event:
// 1. Parse tableId, schemaName, tableName
// 2. Nếu chưa có trong cache, query information_schema:

SELECT COLUMN_NAME, COLLATION_NAME, CHARACTER_SET_NAME,
       COLUMN_COMMENT, COLUMN_TYPE
FROM information_schema.columns
WHERE table_schema='schema_name' AND table_name='table_name'
ORDER BY ORDINAL_POSITION;

// 3. Cache vào tableMap[tableId]
```

---

## 3. MySQLEvents - High-level API

### Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                      MySQLEvents                                 │
├─────────────────────────────────────────────────────────────────┤
│  Properties:                                                     │
│  - connection: MySQL connection object                           │
│  - zongJi: ZongJi instance                                      │
│  - expressions: { 'schema.table.column': { statements: {...} }} │
│  - isStarted, isPaused: state flags                             │
├─────────────────────────────────────────────────────────────────┤
│  Methods:                                                        │
│  - start(): Khởi động lắng nghe                                 │
│  - stop(): Dừng lắng nghe                                       │
│  - pause()/resume(): Tạm dừng/tiếp tục                          │
│  - addTrigger(): Đăng ký trigger                                │
│  - removeTrigger(): Hủy trigger                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quy trình xử lý Event

```
MySQL Binlog Event
        │
        ▼
┌───────────────────┐
│ ZongJi.on('binlog')│
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ _handleEvent()    │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ normalizeEvent()  │  ← Chuyển đổi raw event thành format chuẩn
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ findTriggers()    │  ← Tìm các trigger match với event
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ trigger.onEvent() │  ← Gọi callback của từng trigger
└───────────────────┘
```

### Expression Matching

Expression hỗ trợ wildcard `*`:

```javascript
// Match tất cả events
expression: '*'

// Match tất cả tables trong schema 'mydb'
expression: 'mydb.*'

// Match table cụ thể
expression: 'mydb.users'

// Match column cụ thể
expression: 'mydb.users.email'

// Match tất cả databases, table 'users'
expression: '*.users'
```

### Event Object Structure

```javascript
{
  type: 'INSERT' | 'UPDATE' | 'DELETE',
  schema: 'database_name',
  table: 'table_name',
  affectedRows: [
    {
      before: { column1: 'old_value', ... },  // null cho INSERT
      after: { column1: 'new_value', ... }    // null cho DELETE
    }
  ],
  affectedColumns: ['column1', 'column2', ...],
  timestamp: 1234567890123,
  nextPosition: 1234,
  binlogName: 'mysql-bin.000001'
}
```

---

## 4. Data Flow Chi Tiết

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MySQL Server                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Transaction: INSERT INTO users (name) VALUES ('John')          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Binary Log:                                                     │   │
│  │  [TableMap Event] → tableId=123, schema=mydb, table=users       │   │
│  │  [WriteRows Event] → tableId=123, rows=[{name:'John'}]          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ MySQL Replication Protocol
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            ZongJi                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  1. Nhận TableMap Event                                          │   │
│  │     - Parse: tableId=123, schemaName='mydb', tableName='users'  │   │
│  │     - Nếu chưa có trong cache → Query information_schema        │   │
│  │     - Cache: tableMap[123] = { columnSchemas, ... }             │   │
│  │                                                                  │   │
│  │  2. Nhận WriteRows Event                                         │   │
│  │     - Lookup tableMap[123] để lấy column info                   │   │
│  │     - Parse row data theo column types                          │   │
│  │     - Emit 'binlog' event                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MySQLEvents                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  1. Nhận binlog event từ ZongJi                                  │   │
│  │                                                                  │   │
│  │  2. normalizeEvent():                                            │   │
│  │     - Chuyển 'writerows' → type: 'INSERT'                       │   │
│  │     - Extract affectedRows, affectedColumns                      │   │
│  │                                                                  │   │
│  │  3. findTriggers():                                              │   │
│  │     - So sánh event với registered expressions                  │   │
│  │     - 'mydb.users' matches expression 'mydb.*' ✓                │   │
│  │     - 'INSERT' matches statement 'ALL' hoặc 'INSERT' ✓          │   │
│  │                                                                  │   │
│  │  4. Gọi trigger.onEvent(normalizedEvent)                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Application Code                                  │
│  instance.addTrigger({                                                  │
│    name: 'user-insert',                                                 │
│    expression: 'mydb.users',                                            │
│    statement: MySQLEvents.STATEMENTS.INSERT,                            │
│    onEvent: (event) => {                                                │
│      console.log('New user:', event.affectedRows[0].after.name);       │
│      // Output: "New user: John"                                        │
│    }                                                                    │
│  });                                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Code Examples

### Basic Usage

```javascript
const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events');

async function main() {
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
  });

  const instance = new MySQLEvents(connection, {
    startAtEnd: true,  // Chỉ nhận events từ thời điểm kết nối
    excludedSchemas: {
      mysql: true,     // Bỏ qua system database
    },
  });

  await instance.start();

  // Lắng nghe INSERT vào bảng users
  instance.addTrigger({
    name: 'user-inserts',
    expression: 'mydb.users',
    statement: MySQLEvents.STATEMENTS.INSERT,
    onEvent: (event) => {
      event.affectedRows.forEach(row => {
        console.log('New user created:', row.after);
      });
    },
  });

  // Lắng nghe UPDATE cột 'status' trong bảng orders
  instance.addTrigger({
    name: 'order-status-changes',
    expression: 'mydb.orders.status',
    statement: MySQLEvents.STATEMENTS.UPDATE,
    onEvent: (event) => {
      event.affectedRows.forEach(row => {
        console.log(`Order status changed: ${row.before.status} → ${row.after.status}`);
      });
    },
  });

  // Error handling
  instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
  instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);
}

main().catch(console.error);
```

### Với NestJS

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mysql from 'mysql';
import * as MySQLEvents from '@rodrigogs/mysql-events';

@Injectable()
export class MySQLEventsService implements OnModuleInit, OnModuleDestroy {
  private instance: any;

  async onModuleInit() {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    this.instance = new MySQLEvents(connection, {
      startAtEnd: true,
    });

    await this.instance.start();

    this.instance.addTrigger({
      name: 'all-changes',
      expression: '*',
      statement: MySQLEvents.STATEMENTS.ALL,
      onEvent: this.handleEvent.bind(this),
    });
  }

  private handleEvent(event: any) {
    console.log(`[${event.type}] ${event.schema}.${event.table}`, event.affectedRows);
  }

  async onModuleDestroy() {
    await this.instance?.stop();
  }
}
```

---

## 6. Lưu ý quan trọng

### Performance

1. **TableMap caching**: ZongJi cache thông tin bảng, nhưng khi schema thay đổi (ALTER TABLE), cache có thể outdated
2. **Connection pause**: Khi query information_schema, connection bị pause để tránh mất events

### Limitations

1. **TRUNCATE**: Không tạo DeleteRows event. Sử dụng `DELETE FROM table` thay thế
2. **BIGINT**: JavaScript chỉ hỗ trợ số nguyên đến 2^53, không phải 2^64
3. **DATETIME precision**: Chỉ hỗ trợ millisecond precision do JavaScript Date limitation

### Troubleshooting

```javascript
// Debug mode
process.env.DEBUG = 'debuggler';

// Check binlog status
// mysql> SHOW BINARY LOGS;
// mysql> SHOW BINLOG EVENTS IN 'mysql-bin.000001';

// Check replication user permissions
// mysql> SHOW GRANTS FOR 'user'@'localhost';
```

---

## 7. Tham khảo

- [MySQL Replication Protocol](http://dev.mysql.com/doc/internals/en/replication-protocol.html)
- [MySQL Binary Log Events](http://dev.mysql.com/doc/internals/en/binlog-event.html)
- [@rodrigogs/mysql-events GitHub](https://github.com/rodrigogs/mysql-events)
- [@rodrigogs/zongji GitHub](https://github.com/rodrigogs/zongji)

import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'


@Entity('videos', { schema: 'master' })
@Index('idx_videos_course_user_id', ['userId'])
export class Videos {
  @PrimaryGeneratedColumn({
    type: 'int',
    name: 'id',
    comment: 'ID',
  })
    id: number

  @Column('tinyint', {
    name: 'is_valid',
    comment: 'データ有効フラグ\n0:無効、1:有効',
    default: () => '0',
  })
    isValid: number

  @Column('tinyint', {
    name: 'status_type',
    comment: '0: deleted, 1: active',
  })
    statusType: number

  @Column('int', {
    name: 'user_id',
    comment: 'ref: privacy.users',
  })
    userId: number

  @Column('varchar', {
    name: 'title',
    length: 50,
  })
    title: string

  @Column('varchar', {
    name: 'provider_uuid',
    length: 250,
    comment: 'ref: 3rd',
  })
    providerUUID: string

  @Column('float', {
    name: 'size_in_mb',
    nullable: true,
  })
    sizeInMb: number | null

  @Column('varchar', {
    name: 'file_type',
    length: 50,
    nullable: true,
  })
    fileType: string | null


  @Column('varchar', {
    name: 'err_reason_code',
    length: 255,
    nullable: true,
  })
    errReasonCode: string | null

  @Column('int', {
    name: 'total_time_in_sec',
    nullable: true,
  })
    totalTimeInSec: number | null

  @Column('int', {
    name: 'view_count',
    comment: 'Total number of views',
    default: () => '0',
  })
  viewCount: number

  @Column('int', {
    name: 'like_count',
    comment: 'Total number of likes',
    default: () => '0',
  })
  likeCount: number

  @Column('timestamp', {
    name: 'created_at',
    comment: '作成日時',
    default: () => 'CURRENT_TIMESTAMP',
  })
    createdAt: Date

  @Column('timestamp', {
    name: 'updated_at',
    comment: '更新日時',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
    updatedAt: Date
}

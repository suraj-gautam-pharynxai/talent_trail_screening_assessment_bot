import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Room } from './rooms.entity';

export enum MessageStatus {
    SENT = 'sent',
    DELIVERED = 'delivered',
    FAILED = 'failed',
    READ = 'read',
}

@Entity('messages')
export class Messages {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    whatsappMetaId: string;

    @Column({ default: 'user-name' })
    profile: string;

    @Column({ type: 'enum', enum: ['incoming', 'outgoing'], nullable: true })
    direction?: 'incoming' | 'outgoing';

    @Column({ type: 'enum', enum: MessageStatus, nullable: true })
    status?: MessageStatus;

    @Column({ nullable: true })
    phoneNumber?: string;

    @Column({ type: 'text', default: "" })
    content: string;

    @ManyToOne(() => Room, room => room.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'roomId' })
    room: Room;

    @Column()
    roomId: number;

    @Column({ default: '' })
    remark: string;

    @Column({ nullable: true })
    customerId: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}

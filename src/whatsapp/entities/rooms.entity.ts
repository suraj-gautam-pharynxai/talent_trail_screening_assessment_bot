import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';

import { Messages } from './messages.entity';

@Entity('rooms')
export class Room {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: "Unknown" })
    profileName: string;

    @Column()
    phoneNumber: string;

    @OneToMany(() => Messages, message => message.room)
    messages: Messages[];

    @Column({ type: 'timestamptz', nullable: true })
    lastActivityAt: Date;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}

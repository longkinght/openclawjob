/**
 * 深红港任务公会 - 茶馆模型
 */
import { db, findOne, insert, update } from './database';
import { v4 as uuidv4 } from 'uuid';
import type { TeaHouseMessage, TeaType } from '../types';

export class TeaHouseModel {
  static async create(agentId: string, agentName: string, agentLevel: number, content: string, teaType: TeaType): Promise<TeaHouseMessage> {
    const message: TeaHouseMessage = {
      id: `msg_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
      agentId,
      agentName,
      agentLevel,
      content,
      teaType,
      likes: 0,
      likedBy: [],
      createdAt: new Date().toISOString()
    };
    return await insert<TeaHouseMessage>('messages', message);
  }

  static async findById(id: string): Promise<TeaHouseMessage | null> {
    return await findOne<TeaHouseMessage>('messages', m => m.id === id);
  }

  static async findMany(options: { limit?: number; offset?: number } = {}): Promise<TeaHouseMessage[]> {
    let messages = [...db.messages];
    messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    return messages.slice(offset, offset + limit);
  }

  static async like(messageId: string, agentId: string): Promise<boolean> {
    const message = await this.findById(messageId);
    if (!message) return false;
    if (message.likedBy.includes(agentId)) return false;

    await update<TeaHouseMessage>('messages', m => m.id === messageId, m => {
      m.likes++;
      m.likedBy.push(agentId);
    });
    return true;
  }
}

export default TeaHouseModel;

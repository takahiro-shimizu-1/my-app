import { ContactRepository } from "../repositories/contactRepository";

export class ContactService {
  private repository: ContactRepository;
  constructor(repository?: ContactRepository) {
    this.repository = repository ?? new ContactRepository();
  }
  async getAll() { return this.repository.findAll(); }
  async getById(id: string) { return this.repository.findById(id); }
  async create(name: string, email: string, phone: string) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('name is required');
    }
    return this.repository.create(name.trim(), email?.trim() ?? '', phone?.trim() ?? '');
  }
  async update(id: string, name?: string, email?: string, phone?: string) {
    return this.repository.update(id, name?.trim(), email?.trim(), phone?.trim());
  }
  async delete(id: string) { return this.repository.delete(id); }
}

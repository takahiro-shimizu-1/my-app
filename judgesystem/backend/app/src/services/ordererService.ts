import { OrdererRepository } from "../repositories/ordererRepository";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "../../../../shared/constants";

export class OrdererService {
  private repository: OrdererRepository;
  constructor(repository?: OrdererRepository) {
    this.repository = repository ?? new OrdererRepository();
  }
  async getList(page?: number, pageSize?: number) {
    const p = page ?? DEFAULT_PAGE;
    const ps = Math.min(pageSize ?? DEFAULT_PAGE_SIZE, 100);
    const result = await this.repository.findWithPagination(p, ps);
    return { ...result, page: p, pageSize: ps };
  }
  async getById(id: string) { return this.repository.findById(id); }
}

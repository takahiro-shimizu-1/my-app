import { CompanyRepository } from "../repositories/companyRepository";

export class CompanyService {
  private repository: CompanyRepository;
  constructor(repository?: CompanyRepository) {
    this.repository = repository ?? new CompanyRepository();
  }
  async getAll() { return this.repository.findAll(); }
}

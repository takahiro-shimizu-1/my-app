/**
 * Company data module.
 *
 * Re-exports the fetch function and type from the API layer.
 * Callers should use fetchCompanies directly or via a hook.
 */
import type { CompanyPriority } from '../types';
import type { CompanyWithDetails } from './api/companyApi';

export { fetchCompanies } from './api/companyApi';
export type { CompanyWithDetails } from './api/companyApi';

/**
 * Return a default company priority.
 *
 * TODO: Implement proper priority lookup once company priority data
 * is available from the API.
 */
export const getCompanyPriority = (_name: string): CompanyPriority => {
  return 5;
};

/**
 * @deprecated Companies are now fetched asynchronously via fetchCompanies.
 * This function always returns undefined. Migrate to the hook/API pattern.
 */
export const findCompanyById = (_id: string): CompanyWithDetails | undefined => {
  return undefined;
};

/**
 * @deprecated Companies are now fetched asynchronously via fetchCompanies.
 * This function always returns undefined. Migrate to the hook/API pattern.
 */
export const findCompanyByName = (_name: string): CompanyWithDetails | undefined => {
  return undefined;
};

/**
 * Orderer data module.
 *
 * Re-exports the fetch function from the API layer.
 * Callers should use the useOrderers hook or call fetchOrderers directly.
 */
export { fetchOrderers } from './api/ordererApi';

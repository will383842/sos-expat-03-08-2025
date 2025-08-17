export interface AppError extends Error {
  code?: string;
  details?: any;
}

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Une erreur inconnue est survenue';
};

export const getErrorCode = (error: unknown): string | undefined => {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as any).code;
  }
  return undefined;
};
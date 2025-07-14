import { ApiError } from '../api';

describe('ApiError', () => {
  it('creates an error with message', () => {
    const error = new ApiError('Test error');
    
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ApiError');
    expect(error.status).toBeUndefined();
  });

  it('creates an error with message and status', () => {
    const error = new ApiError('Not found', 404);
    
    expect(error.message).toBe('Not found');
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(404);
  });

  it('is instance of Error', () => {
    const error = new ApiError('Test error');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });
});
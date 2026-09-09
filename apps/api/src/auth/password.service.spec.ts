import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashes a password to something other than the plaintext', async () => {
    const hash = await service.hash('correct horse battery staple');
    expect(hash).not.toBe('correct horse battery staple');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('compare() returns true for the matching plaintext', async () => {
    const hash = await service.hash('correct horse battery staple');
    await expect(
      service.compare('correct horse battery staple', hash),
    ).resolves.toBe(true);
  });

  it('compare() returns false for a wrong plaintext', async () => {
    const hash = await service.hash('correct horse battery staple');
    await expect(service.compare('wrong password', hash)).resolves.toBe(false);
  });
});

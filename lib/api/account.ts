/**
 * Account API client functions for fetching and updating account information.
 */

export interface AccountInfo {
  changedPassword: boolean;
  password: string;
  businessName: string;
  setup: boolean;
  email: string;
  timezone: string;
}

export async function fetchAccountInfo(): Promise<AccountInfo> {
  const res = await fetch('/api/account_info', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch account info: ${res.status}`);
  }

  return res.json();
}

export async function updateTimezone(timezone: string): Promise<{ timezone: string }> {
  const res = await fetch('/api/account_info', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ timezone }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update timezone: ${res.status}`);
  }

  return res.json();
}

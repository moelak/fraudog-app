interface CreateUserPayload {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  username?: string;
}

interface UserResponse {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

class UserService {
  private baseUrl = '/api/users';

  async syncUser(payload: CreateUserPayload, token: string): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserProfile(clerkId: string, token: string): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/${clerkId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }

    return response.json();
  }

  async updateUserProfile(clerkId: string, updates: Partial<CreateUserPayload>, token: string): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/${clerkId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user profile: ${response.statusText}`);
    }

    return response.json();
  }
}

export const userService = new UserService();
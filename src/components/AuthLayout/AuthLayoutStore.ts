import { makeAutoObservable } from "mobx";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  username: string;
}

export class AuthLayoutStore {
  user: User | null = null;
  isUserSynced = false;

  constructor() {
    makeAutoObservable(this);
  }

  setUser(user: User) {
    this.user = user;
  }

  setUserSynced(synced: boolean) {
    this.isUserSynced = synced;
  }

  clearUser() {
    this.user = null;
    this.isUserSynced = false;
  }

  get fullName() {
    if (!this.user) return '';
    return `${this.user.firstName} ${this.user.lastName}`.trim();
  }

  get displayName() {
    if (!this.user) return '';
    return this.fullName || this.user.username || this.user.email;
  }
}

export const authLayoutStore = new AuthLayoutStore();
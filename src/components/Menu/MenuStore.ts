import { makeAutoObservable } from 'mobx';

export class MenuStore {
  isSidebarOpen = true;

  constructor() {
    makeAutoObservable(this);
  }

  openSidebar() {
    this.isSidebarOpen = true;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}

export const menuStore = new MenuStore();

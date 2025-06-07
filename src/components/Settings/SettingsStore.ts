import { makeAutoObservable } from "mobx";

interface SettingsConfig {
  emailAlerts: boolean;
  smsNotifications: boolean;
  twoFactorAuth: boolean;
  alertThreshold: number;
}

export class SettingsStore {
  settings: SettingsConfig = {
    emailAlerts: true,
    smsNotifications: false,
    twoFactorAuth: false,
    alertThreshold: 75
  };

  isSaving = false;

  constructor() {
    makeAutoObservable(this);
    this.loadSettings();
  }

  toggleSetting(key: keyof Omit<SettingsConfig, 'alertThreshold'>) {
    this.settings[key] = !this.settings[key];
  }

  updateAlertThreshold(value: number) {
    this.settings.alertThreshold = value;
  }

  saveSettings() {
    this.isSaving = true;
    
    // Simulate API call
    setTimeout(() => {
      localStorage.setItem('fraudDogSettings', JSON.stringify(this.settings));
      this.isSaving = false;
    }, 1000);
  }

  loadSettings() {
    const saved = localStorage.getItem('fraudDogSettings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }

  resetSettings() {
    this.settings = {
      emailAlerts: true,
      smsNotifications: false,
      twoFactorAuth: false,
      alertThreshold: 75
    };
  }
}

export const settingsStore = new SettingsStore();
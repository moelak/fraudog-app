import { makeAutoObservable } from "mobx";

export class LandingPageStore {
  brandName = "Fraud-dog";
  heroTitle = "Fraud-dog";
  heroDescription = "Our business focuses on identifying and stopping fraud before it causes harm. Fraud-dog helps businesses detect suspicious activity early, allowing them to take action quickly and protect their operations. Whether it's financial fraud, identity theft, or unusual patterns, Fraud-dog is your first line of defense.";
  backgroundImage = "https://images.pexels.com/photos/5380642/pexels-photo-5380642.jpeg";

  constructor() {
    makeAutoObservable(this);
  }

  updateBrandName(name: string) {
    this.brandName = name;
  }

  updateHeroTitle(title: string) {
    this.heroTitle = title;
  }

  updateHeroDescription(description: string) {
    this.heroDescription = description;
  }

  updateBackgroundImage(imageUrl: string) {
    this.backgroundImage = imageUrl;
  }
}

export const landingPageStore = new LandingPageStore();
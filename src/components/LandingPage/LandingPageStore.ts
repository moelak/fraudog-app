import { makeAutoObservable } from "mobx";

export class LandingPageStore {
  brandName = "Catech.AI";
  heroTitle = "Sniffing Out Fraud in Real Time";
  heroDescription = "Our AI agents follow every transaction trail — before fraud strikes.";
  backgroundImage = ""; // Not used in the new design

  constructor() {
    makeAutoObservable(this);
  }

  updateHeroTitle(title: string) {
    this.heroTitle = title;
  }

  // New properties for the updated design
  features = [
    {
      title: "Real-Time Monitoring",
      description: "24/7 surveillance of all transactions with instant alerts",
      icon: "🔍"
    },
    {
      title: "Pattern Recognition", 
      description: "Advanced ML models detect subtle fraud patterns",
      icon: "🧠"
    },
    {
      title: "Predictive Analytics",
      description: "Prevent fraud before it happens with predictive insights", 
      icon: "🔮"
    }
  ];

  aboutSection = {
    title: "Built for Analysts, Loved by Engineers",
    description: "Let our AI handle the complexity while you focus on decisions that matter. Our intuitive interface makes fraud detection accessible to everyone.",
    benefits: [
      "Automated threat detection and response",
      "Customizable rules and thresholds", 
      "Comprehensive reporting and analytics",
      "Seamless integration with existing systems"
    ]
  };

  blogPosts = [
    {
      title: "The Future of AI in Fraud Detection",
      excerpt: "Exploring how machine learning is revolutionizing fraud prevention...",
      date: "Dec 15, 2024"
    },
    {
      title: "Real-Time Analytics: A Game Changer", 
      excerpt: "How instant data processing is transforming security protocols...",
      date: "Dec 12, 2024"
    },
    {
      title: "Building Resilient Financial Systems",
      excerpt: "Best practices for implementing robust fraud detection systems...",
      date: "Dec 10, 2024"
    }
  ];


  updateBrandName(name: string) {
    this.brandName = name;
  }



  updateHeroDescription(description: string) {
    this.heroDescription = description;
  }

  updateBackgroundImage(imageUrl: string) {
    this.backgroundImage = imageUrl;
  }

  addFeature(feature: { title: string; description: string; icon: string }) {
    this.features.push(feature);
  }

  updateFeature(index: number, feature: { title: string; description: string; icon: string }) {
    if (index >= 0 && index < this.features.length) {
      this.features[index] = feature;
    }
  }

  addBlogPost(post: { title: string; excerpt: string; date: string }) {
    this.blogPosts.unshift(post);
  }

  updateAboutSection(updates: Partial<typeof this.aboutSection>) {
    Object.assign(this.aboutSection, updates);
  }
}

export const landingPageStore = new LandingPageStore();
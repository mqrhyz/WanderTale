"use client";

import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "vi" | "en";

const STORAGE_KEY = "wander-tale-locale";

export const messages = {
  vi: {
    hero: {
      nav: {
        story: "Câu chuyện",
        dashboard: "Bảng điều khiển",
        createTrip: "Tạo chuyến",
        signUp: "Đăng ký",
      },
      body:
        "Lên kế hoạch dễ dàng hơn. Di chuyển thông minh hơn. Du lịch trọn vẹn hơn. WanderTale tự động xây dựng lịch trình tối ưu dựa trên sở thích, ngân sách và dữ liệu thời gian thực để mỗi chuyến đi đều được thiết kế riêng cho bạn.",
      cta: "Dùng thử miễn phí",
      langLabel: "Đổi sang tiếng Anh",
    },
    about: {
      kicker: "Vì sao chọn WanderTale",
      line1: "WanderTale được tạo ra để mỗi chuyến đi trở nên đơn giản, thông minh và đầy cảm hứng.",
      line2:
        "AI kết hợp lịch trình cá nhân hóa, thời tiết, bản đồ và ưu đãi độc quyền trong một nền tảng duy nhất giúp bạn luôn biết bước tiếp theo nên là gì.",
      line3: "Từ ý tưởng đầu tiên đến ngày lên đường, WanderTale đồng hành cùng bạn trong từng quyết định.",
      reveal:
        "Công nghệ tốt nhất không thay bạn quyết định mà giúp bạn tự tin hơn với mọi lựa chọn trên hành trình.",
    },
    features: {
      headline1: "Nơi ý tưởng bắt đầu và hành trình của bạn được hiện thực hóa",
      headline2: "Nâng tầm trải nghiệm, kiến tạo quyết định thông minh.",
      learnMore: "Khám phá thêm →",
      cards: [
        {
          title: "Một canvas cho toàn bộ chuyến đi của bạn.",
          body:
            "Từ cảm hứng ban đầu đến lịch trình hoàn chỉnh, mọi thông tin được kết nối trong một không gian trực quan duy nhất.",
        },
        {
          title: "Storyboard chuyến đi",
          bullets: [
            "Chia hành trình theo từng ngày, sáng - chiều - tối.",
            "Dễ dàng chỉnh sửa khi kế hoạch thay đổi.",
            "Kết hợp bản đồ, thời tiết và ngân sách trong cùng một dòng chảy.",
            "Lưu trữ an toàn và đồng bộ trên mọi thiết bị.",
          ],
        },
        {
          title: "Gợi ý thông minh",
          bullets: [
            "AI tạo lịch trình phù hợp với sở thích và ngân sách của bạn.",
            "Tối ưu theo thời tiết, giao thông và thời gian thực.",
            "Đề xuất khách sạn, nhà hàng và hoạt động phù hợp.",
            "Tích hợp ưu đãi đối tác ngay trong hành trình.",
          ],
        },
        {
          title: "Trải nghiệm đắm chìm",
          bullets: [
            "Giao diện tối giản, giúp bạn tập trung vào chuyến đi.",
            "Đồng bộ liền mạch giữa web và ứng dụng di động.",
            "Mọi thông tin quan trọng hiển thị trong một cái nhìn.",
            "Được thiết kế để lập kế hoạch sâu nhưng sử dụng nhẹ nhàng.",
          ],
        },
      ],
    },
    footer: {
      login: "Đăng nhập",
      register: "Đăng ký",
      tagline: "WanderTale - trợ lý du lịch AI",
      note: "Bản thử nghiệm / đồ án EXE202",
    },
  },
  en: {
    hero: {
      nav: {
        story: "Story",
        dashboard: "Dashboard",
        createTrip: "Create trip",
        signUp: "Sign up",
      },
      body:
        "Plan with less friction. Move with better context. Travel with more confidence. WanderTale builds a personalized itinerary from your preferences, budget, and real-time signals.",
      cta: "Try for free",
      langLabel: "Switch to Vietnamese",
    },
    about: {
      kicker: "Why choose WanderTale",
      line1: "WanderTale is built to make every trip simpler, smarter, and more inspiring.",
      line2:
        "AI brings personalized itineraries, weather, maps, and partner offers into one platform so you always know the best next step.",
      line3: "From the first idea to departure day, WanderTale supports every decision along the way.",
      reveal:
        "The best technology does not decide for you. It gives you more confidence in every choice on the journey.",
    },
    features: {
      headline1: "Where ideas begin and your journey comes to life",
      headline2: "Elevate the experience. Make smarter travel decisions.",
      learnMore: "Explore more →",
      cards: [
        {
          title: "One canvas for your whole trip.",
          body:
            "From early inspiration to a complete itinerary, every detail connects inside one clear planning space.",
        },
        {
          title: "Trip storyboard",
          bullets: [
            "Organize each journey by day: morning, afternoon, and evening.",
            "Adjust the plan easily when things change.",
            "Connect maps, weather, and budget in one flow.",
            "Keep everything secure and synced across devices.",
          ],
        },
        {
          title: "Smart recommendations",
          bullets: [
            "AI creates itineraries around your preferences and budget.",
            "Optimize around weather, traffic, and real-time signals.",
            "Suggest hotels, restaurants, and activities that fit.",
            "Bring partner offers directly into the journey.",
          ],
        },
        {
          title: "Immersive experience",
          bullets: [
            "A focused interface that keeps attention on the trip.",
            "Smooth sync between web and mobile apps.",
            "Important details visible at a glance.",
            "Designed for deep planning while staying lightweight.",
          ],
        },
      ],
    },
    footer: {
      login: "Log in",
      register: "Sign up",
      tagline: "WanderTale - AI travel assistant",
      note: "Beta / EXE202 project",
    },
  },
} as const;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (typeof messages)[Locale];
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "vi" || stored === "en") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem(STORAGE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale: () => setLocale(locale === "vi" ? "en" : "vi"),
      t: messages[locale],
    }),
    [locale]
  );

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}

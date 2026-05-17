import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ruhiz.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/projects", "/marketplace", "/knowledge", "/study-groups", "/startups"],
        disallow: [
          "/api/*",
          "/admin/*",
          "/messages/*",
          "/notifications/*",
          "/settings/*",
          "/onboarding/*",
          "/profile/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

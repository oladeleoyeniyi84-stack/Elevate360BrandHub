import { Helmet } from "react-helmet-async";

type SEOProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  keywords?: string;
};

const SITE_NAME = "Elevate360Official";
const SITE_URL = "https://www.elevate360official.com";
const DEFAULT_IMAGE = `${SITE_URL}/social-preview/elevate360-logo-share.png`;

export function SEO({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  type = "website",
  keywords = [
    "Elevate360Official",
    "Elevate360",
    "Oladele Oyeniyi",
    "apps",
    "books",
    "music",
    "art",
    "Video Crafter",
    "Bondedlove",
    "Healthwisesupport",
    "digital ecosystem",
    "brand hub",
    "AI content consultation",
    "brand strategy",
    "digital experiences",
    "creative tools",
  ].join(", "),
}: SEOProps) {
  const canonical = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <html lang="en" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
      <meta name="googlebot" content="index,follow,max-image-preview:large" />
      <link rel="canonical" href={canonical} />

      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Elevate360Official brand preview" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <meta name="theme-color" content="#06142f" />
      <meta property="fb:app_id" content="122150153540988040" />
    </Helmet>
  );
}

export default SEO;

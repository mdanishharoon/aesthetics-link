type AestheticsLinkWordmarkProps = {
  className?: string;
};

/** Text logotype matching the preloader (Editorial New italic). */
export default function AestheticsLinkWordmark({
  className = "",
}: AestheticsLinkWordmarkProps) {
  return (
    <span className={`aesthetics-link-wordmark${className ? ` ${className}` : ""}`}>
      aestheticslink
    </span>
  );
}

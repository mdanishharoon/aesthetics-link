import Image from "next/image";
import Link from "next/link";
import styles from "./SocialConnect.module.css";

export default function SocialConnect() {
  return (
    <section className={styles.section} aria-labelledby="social-connect-title">
      <div className={styles.shell}>
        <div className={styles.intro}>
          <div className={styles.thumbTop}>
            <Image
              src="/images/connect-1.jpg"
              alt="Skincare ritual"
              fill
              sizes="(max-width: 767px) 38vw, 18vw"
            />
          </div>
          <p className={styles.copy}>
            Get the latest news about skincare tips and new products.
          </p>
        </div>

        <div className={styles.feature}>
          <h2 id="social-connect-title" className={styles.title}>
            CONNECT
            <br />
            WITH US
          </h2>

          <Link
            href="https://www.instagram.com/aestheticslinkuk/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mainImage}
            aria-label="Visit AestheticsLink on Instagram"
          >
            <Image
              src="/images/instagram.jpeg"
              alt="AestheticsLink on Instagram"
              fill
              sizes="(max-width: 767px) 100vw, 62vw"
              priority={false}
            />
          </Link>

          <p className={styles.scriptLabel}>
            on
            <br />
            instagram
          </p>

          <Link
            href="https://www.instagram.com/aestheticslinkuk/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cta}
          >
            Follow on Instagram
          </Link>
        </div>

        <div className={styles.outro}>
          <div className={styles.thumbBottom}>
            <Image
              src="/images/IMG_7461.jpg"
              alt="Close-up skincare portrait"
              fill
              sizes="(max-width: 767px) 38vw, 18vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

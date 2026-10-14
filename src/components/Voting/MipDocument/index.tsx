import "./Styles.scss";

import React, { useEffect, useMemo, useState } from "react";
import Markdown, { type Components, defaultUrlTransform } from "react-markdown";
import { Link } from "react-router-dom";
import remarkGfm from "remark-gfm";

import { mipNumber } from "../../../hooks/useMips";

// Renders a MIP's markdown (from the proposal registry) inside the dapp.
// The document is third-party text shown next to wallet actions, so:
// - raw HTML is dropped (skipHtml) and urls go through react-markdown's
//   defaultUrlTransform, which strips javascript:/data: and similar schemes;
// - images are only shown when the API listed them as the document's own
//   (under assetsBaseUrl). They are fetched and shown from blob: urls, which
//   the CSP's img-src already allows, and an <img> never runs an SVG's
//   scripts;
// - links to other MIP documents open their page here, other links open in a
//   new tab without opener/referrer.

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Discourse emoji shortcodes the documents use (they are written for the
// forum); anything else is left as text.
const EMOJI: Record<string, string> = {
    memo: "📝",
    warning: "⚠️",
    information_source: "ℹ️",
    white_check_mark: "✅",
    x: "❌",
    bulb: "💡",
    pushpin: "📌",
};

// .../MIP263101-some-title.md (optionally #anchor), as rewritten by the API
const MIP_DOCUMENT_LINK = /\/MIP(\d{6})-[^/]*\.md(#.*)?$/;

function prepare(markdown: string): string {
    // The page shows the title itself: drop the document's leading heading
    const body = markdown.replace(/^\s*#{1,2}\s+.*(\r?\n|$)/, "");
    // Leave fenced code blocks alone
    return body
        .split(/(```[\s\S]*?```)/)
        .map((part, i) =>
            i % 2
                ? part
                : part.replace(
                      /:([a-z_]+):/g,
                      (match, name: string) => EMOJI[name] ?? match
                  )
        )
        .join("");
}

function BlobImage({ src, alt }: { src: string; alt: string }) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        let created: string | null = null;
        setObjectUrl(null);
        setFailed(false);

        fetch(src, {
            signal: controller.signal,
            credentials: "omit",
            referrerPolicy: "no-referrer",
        })
            .then(async (response) => {
                const type = (response.headers.get("content-type") ?? "")
                    .split(";")[0]
                    .trim()
                    .toLowerCase();
                const isSvg =
                    type === "image/svg+xml" ||
                    /\.svg$/i.test(new URL(src).pathname);
                // raw.githubusercontent.com serves SVGs as text/plain
                if (!response.ok || !(type.startsWith("image/") || isSvg)) {
                    throw new Error(`unexpected image response (${type})`);
                }
                const data = await response.blob();
                if (data.size > MAX_IMAGE_BYTES) {
                    throw new Error("image too large");
                }
                const blob = new Blob([data], {
                    type: isSvg ? "image/svg+xml" : type,
                });
                created = URL.createObjectURL(blob);
                setObjectUrl(created);
            })
            .catch(() => {
                if (!controller.signal.aborted) setFailed(true);
            });

        return () => {
            controller.abort();
            if (created) URL.revokeObjectURL(created);
        };
    }, [src]);

    if (failed) {
        return (
            <span className="mip-document__image-missing">[{alt || src}]</span>
        );
    }
    if (!objectUrl) {
        return (
            <span
                className="mip-document__image-loading"
                role="img"
                aria-label={alt}
            />
        );
    }
    return <img className="mip-document__image" src={objectUrl} alt={alt} />;
}

interface MipDocumentProps {
    markdown: string;
    images: string[];
}

export default function MipDocument({
    markdown,
    images,
}: MipDocumentProps): React.ReactElement {
    const allowedImages = useMemo(() => new Set(images), [images]);
    const source = useMemo(() => prepare(markdown), [markdown]);

    const components: Components = useMemo(
        () => ({
            // Keep the document's headings below the page's own h1
            h1: ({ children }) => <h2>{children}</h2>,
            h2: ({ children }) => <h3>{children}</h3>,
            h3: ({ children }) => <h4>{children}</h4>,
            h4: ({ children }) => <h5>{children}</h5>,
            img: ({ src, alt }) =>
                src && allowedImages.has(src) ? (
                    <BlobImage src={src} alt={alt ?? ""} />
                ) : (
                    <span className="mip-document__image-missing">
                        [{alt || src}]
                    </span>
                ),
            a: ({ href, children }) => {
                if (!href) return <span>{children}</span>;
                const mip = href.match(MIP_DOCUMENT_LINK);
                if (mip) {
                    return (
                        <Link to={`/voting/mip/${mipNumber(mip[1])}`}>
                            {children}
                        </Link>
                    );
                }
                if (href.startsWith("#")) return <a href={href}>{children}</a>;
                return (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                    >
                        {children}
                    </a>
                );
            },
            table: ({ children }) => (
                <div className="mip-document__table">
                    <table>{children}</table>
                </div>
            ),
        }),
        [allowedImages]
    );

    return (
        <div className="mip-document">
            <Markdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                urlTransform={defaultUrlTransform}
                components={components}
            >
                {source}
            </Markdown>
        </div>
    );
}

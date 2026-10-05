"""Static site checks; run from repository root: py -m unittest discover -s tests -v."""
from html.parser import HTMLParser
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1] / "site"
HTML_PAGES = ("index.html", "ios/index.html", "privacy/index.html", "terms/index.html", "404.html")


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.titles = []
        self.meta = []
        self.headings = []

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if data.get("id"):
            self.ids.add(data["id"])
        if tag in ("a", "link", "script"):
            target = data.get("href", data.get("src"))
            if target:
                self.links.append(target)
        if tag == "meta":
            self.meta.append(data)
        if tag in ("h1", "h2", "h3"):
            self.headings.append(tag)


class SiteTests(unittest.TestCase):
    def parse(self, page):
        parser = PageParser()
        parser.feed((ROOT / page).read_text(encoding="utf-8"))
        return parser

    def test_required_files(self):
        for file in (*HTML_PAGES, "assets/main.js", "assets/styles.css", "assets/favicon.svg", "robots.txt", "sitemap.xml", "_routes.json"):
            with self.subTest(file=file):
                self.assertTrue((ROOT / file).is_file(), file)

    def test_internal_paths_and_anchors(self):
        page_parsers = {page: self.parse(page) for page in HTML_PAGES}
        for page, parser in page_parsers.items():
            for link in parser.links:
                if not link.startswith(("/", "#")) or link.startswith("//"):
                    continue
                if link.startswith("#"):
                    self.assertIn(link[1:], parser.ids, f"{page}: {link}")
                    continue
                url_path, _, anchor = link[1:].partition("#")
                filepath = ROOT / url_path
                if not url_path or url_path.endswith("/"):
                    filepath = filepath / "index.html"
                self.assertTrue(filepath.is_file(), f"{page}: {link}")
                if anchor:
                    target_page = "index.html" if not url_path else f"{url_path.rstrip('/')}/index.html"
                    self.assertIn(anchor, page_parsers[target_page].ids, f"{page}: {link}")

    def test_home_and_ios_positioning(self):
        home = (ROOT / "index.html").read_text(encoding="utf-8")
        ios = (ROOT / "ios/index.html").read_text(encoding="utf-8")
        self.assertIn("Production iOS engineering", home)
        self.assertIn("7+ years native iOS experience", home)
        self.assertIn("Need help with a <em>production iOS app?</em>", ios)
        self.assertIn("Get an iOS Technical Review", ios)
        self.assertIn("The review focuses on the agreed code, architecture, and project materials.", home)
        self.assertIn("Runtime profiling, build verification, device testing, or release execution can be scoped separately", ios)
        self.assertIn('/assets/polish.20261005.css', home)
        self.assertIn('/assets/polish.20261005.css', ios)
        for ambiguous_claim in (
            "Performance investigation",
            "Release support",
            ">Memory management<",
            ">Testing &amp; delivery risk<",
            ">Build / release concerns<"
        ):
            self.assertNotIn(ambiguous_claim, home + ios)
        self.assertNotIn("world-class", (home + ios).lower())
        self.assertNotIn("guaranteed", (home + ios).lower())

    def test_seo_metadata_and_structured_data(self):
        expectations = {
            "index.html": ("ERB — iOS Engineering &amp; Technical Consulting", "https://erbhq.com/"),
            "ios/index.html": ("iOS Technical Review &amp; Consulting | ERB", "https://erbhq.com/ios/")
        }
        for page, (title, canonical) in expectations.items():
            text = (ROOT / page).read_text(encoding="utf-8")
            with self.subTest(page=page):
                self.assertIn(f"<title>{title}</title>", text)
                self.assertIn(f'<link rel="canonical" href="{canonical}">', text)
                self.assertIn('property="og:title"', text)
                self.assertIn('name="twitter:card"', text)
                self.assertIn('type="application/ld+json"', text)
                structured = text.split('<script type="application/ld+json">', 1)[1].split("</script>", 1)[0]
                json.loads(structured)

    def test_contact_form_and_client_states(self):
        for page in ("index.html", "ios/index.html"):
            html = (ROOT / page).read_text(encoding="utf-8")
            with self.subTest(page=page):
                self.assertIn('class="contact-form"', html)
                self.assertIn('action="/api/contact"', html)
                self.assertIn('name="projectUrl"', html)
                self.assertIn('name="stack"', html)
                self.assertIn('name="timeline"', html)
                self.assertIn("Please do not send confidential source code or credentials", html)
        js = (ROOT / "assets/main.js").read_text(encoding="utf-8")
        self.assertIn("fetch('/api/contact'", js)
        self.assertIn("Sending your enquiry", js)
        self.assertIn("dataset.state = 'success'", js)
        self.assertIn("dataset.state = 'error'", js)
        self.assertIn("navigator.clipboard", js)

    def test_contact_function_configuration(self):
        api = (ROOT.parent / "functions/api/contact.js").read_text(encoding="utf-8")
        routes = json.loads((ROOT / "_routes.json").read_text(encoding="utf-8"))
        self.assertEqual(routes["include"], ["/api/*"])
        self.assertIn("env.RESEND_API_KEY", api)
        self.assertIn("api.resend.com/emails", api)
        self.assertIn("reply_to: email", api)
        self.assertIn("projectUrl", api)
        self.assertNotIn("re_x", api)

    def test_privacy_discloses_form_services_and_fields(self):
        policy = (ROOT / "privacy/index.html").read_text(encoding="utf-8")
        for term in ("Resend", "Cloudflare Pages Function", "current iOS stack", "source code"):
            self.assertIn(term, policy)

    def test_public_pages_do_not_include_editor_instructions(self):
        for page in HTML_PAGES:
            text = (ROOT / page).read_text(encoding="utf-8").lower()
            with self.subTest(page=page):
                self.assertNotIn("before publishing", text)
                self.assertNotIn("the operator should", text)


if __name__ == "__main__":
    unittest.main()
"""Quick static checks; run from repository root: py -m unittest discover -s tests -v."""
from pathlib import Path
import unittest
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1] / "site"

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if data.get("id"):
            self.ids.add(data["id"])
        if tag in ("a", "link", "script"):
            target = data.get("href", data.get("src"))
            if target:
                self.links.append(target)

class SiteTests(unittest.TestCase):
    def test_required_pages(self):
        for file in ("index.html", "privacy/index.html", "terms/index.html", "404.html", "assets/main.js", "assets/styles.css", "assets/favicon.svg", "robots.txt", "sitemap.xml"):
            with self.subTest(file=file):
                self.assertTrue((ROOT / file).is_file(), file)

    def test_internal_paths_and_home_anchors(self):
        home_parser = LinkParser()
        home_parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
        for page in ("index.html", "privacy/index.html", "terms/index.html", "404.html"):
            parser = LinkParser()
            parser.feed((ROOT / page).read_text(encoding="utf-8"))
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
                if anchor and url_path == "":
                    self.assertIn(anchor, home_parser.ids, f"{page}: {link}")

    def test_contact_email_and_copy_control(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "assets/main.js").read_text(encoding="utf-8")
        self.assertIn('href="mailto:hello@erbhq.com"', html)
        self.assertIn('data-copy-email="hello@erbhq.com"', html)
        self.assertIn('id="copy-contact-status"', html)
        self.assertIn("navigator.clipboard", js)
        self.assertIn("copyEmailButton.addEventListener('click'", js)
        self.assertIn('https://thirumalaiyar.com/', html)
        self.assertNotIn('dineshbabucse1@gmail.com', html)

    def test_public_pages_do_not_include_editor_instructions(self):
        for page in ("index.html", "privacy/index.html", "terms/index.html"):
            text = (ROOT / page).read_text(encoding="utf-8").lower()
            with self.subTest(page=page):
                self.assertNotIn("before publishing", text)
                self.assertNotIn("the operator should", text)

if __name__ == "__main__":
    unittest.main()

# GEMINI.md

## Project Overview

This is a static personal blog website built using [Jekyll](https://jekyllrb.com/), hosted on GitHub Pages. It utilizes the [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) theme to provide a modern, responsive, and minimal design. The content is primarily in Traditional Chinese (`zh-TW`).

### Key Technologies
*   **Static Site Generator:** Jekyll (~> 4.3)
*   **Theme:** `jekyll-theme-chirpy` (~> 7.2)
*   **Language:** Ruby (for building)
*   **Hosting/CI:** GitHub Pages & GitHub Actions

## Directory Structure

*   **`_config.yml`**: The main configuration file for the Jekyll site (title, author, plugins, theme settings).
*   **`_posts/`**: Contains the blog posts. Naming convention: `YYYY-MM-DD-title.md`.
*   **`_pages/`**: Contains standalone pages like `about.md`, `archive.md`.
*   **`_tabs/`**: Contains pages that appear as tabs in the Chirpy theme navigation (e.g., Tags, Categories).
*   **`_data/`**: Data files, such as `navigation.yml` for menu structure.
*   **`assets/`**: Static files including images (`assets/images/`) and custom CSS (`assets/css/`).
*   **`.github/workflows/`**: GitHub Actions workflow (`jekyll.yml`) for automated building and deployment.
*   **`Gemfile`**: Defines the Ruby gem dependencies.

## Building and Running

### Prerequisites
*   Ruby (version compatible with Jekyll, e.g., 3.3 as seen in workflow)
*   Bundler

### Development Commands

1.  **Install Dependencies:**
    ```bash
    bundle install
    ```

2.  **Run Local Server:**
    Start the local development server with live reloading.
    ```bash
    bundle exec jekyll serve
    ```
    Access the site at `http://127.0.0.1:4000/`.

3.  **Build for Production:**
    Generate the static site into the `_site` directory.
    ```bash
    bundle exec jekyll build
    ```

## Development Conventions

*   **Post Creation:** Create new posts in `_posts/` using the filename format `YYYY-MM-DD-title.md`. Ensure the Front Matter includes `title`, `date`, `categories`, and `tags`.
*   **Theme Customization:**
    *   Configuration changes are mostly done in `_config.yml`.
    *   Custom CSS can be added/modified in `assets/css/`.
    *   Layout overrides would go into `_layouts` or `_includes` (though currently using theme defaults).
*   **Localization:** The site is configured for `zh-TW` (Traditional Chinese) and `Asia/Taipei` timezone.
*   **Deployment:** Changes pushed to the `master` branch trigger the GitHub Actions workflow to build and deploy to GitHub Pages.

// Mermaid initialization script for Minimal Mistakes theme
// This script handles the initialization of Mermaid diagrams and theme switching

document.addEventListener('DOMContentLoaded', function () {
    // Function to get the appropriate Mermaid theme based on current page theme
    function getMermaidTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        return currentTheme === 'dark' ? 'dark' : 'default';
    }

    // Initialize Mermaid with configuration
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: getMermaidTheme(),
            securityLevel: 'loose',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            }
        });

        // Render all mermaid diagrams
        // Jekyll wraps code blocks with 'language-mermaid' class
        const mermaidElements = document.querySelectorAll('.language-mermaid');

        mermaidElements.forEach(function (element, index) {
            // Get the mermaid code from the element
            const code = element.textContent;

            // Create a new div to hold the rendered diagram
            const mermaidDiv = document.createElement('div');
            mermaidDiv.className = 'mermaid';
            mermaidDiv.textContent = code;

            // Replace the code block with the mermaid div
            element.parentNode.replaceChild(mermaidDiv, element);
        });

        // Run mermaid rendering
        mermaid.run({
            nodes: document.querySelectorAll('.mermaid'),
        });

        // Add click-to-zoom functionality
        setTimeout(function () {
            addMermaidZoomFunctionality();
        }, 500);
    }

    // Monitor theme changes and reload page to re-render diagrams
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.attributeName === 'data-theme') {
                location.reload();
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });
});

// Function to add zoom functionality to Mermaid diagrams
function addMermaidZoomFunctionality() {
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'mermaid-modal';
    modal.innerHTML = `
    <div class="mermaid-modal-overlay"></div>
    <div class="mermaid-modal-content">
      <button class="mermaid-modal-close">&times;</button>
      <div class="mermaid-modal-body"></div>
    </div>
  `;
    document.body.appendChild(modal);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
    #mermaid-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 99999;
    }

    #mermaid-modal.active {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mermaid-modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(5px);
    }

    .mermaid-modal-content {
      position: relative;
      z-index: 1;
      background: #fff;
      border-radius: 12px;
      padding: 30px;
      max-width: 95vw;
      max-height: 95vh;
      overflow: auto;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    }

    [data-theme="dark"] .mermaid-modal-content {
      background: #1a1a2e;
    }

    .mermaid-modal-close {
      position: absolute;
      top: 10px;
      right: 15px;
      background: none;
      border: none;
      font-size: 2rem;
      cursor: pointer;
      color: #666;
      line-height: 1;
      padding: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
    }

    .mermaid-modal-close:hover {
      background: rgba(0, 0, 0, 0.1);
      color: #333;
    }

    [data-theme="dark"] .mermaid-modal-close {
      color: #aaa;
    }

    [data-theme="dark"] .mermaid-modal-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .mermaid-modal-body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding-top: 10px;
    }

    .mermaid-modal-body svg {
      display: block;
      max-width: none !important;
      max-height: none !important;
    }

    .mermaid {
      cursor: zoom-in;
      transition: transform 0.2s, box-shadow 0.2s;
      margin: 1em 0;
    }

    .mermaid:hover {
      box-shadow: 0 4px 20px rgba(0, 131, 143, 0.3);
    }
  `;
    document.head.appendChild(style);

    // Close modal function
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Add event listeners
    modal.querySelector('.mermaid-modal-overlay').addEventListener('click', closeModal);
    modal.querySelector('.mermaid-modal-close').addEventListener('click', closeModal);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });

    // Add click handlers to all mermaid diagrams
    document.querySelectorAll('.mermaid').forEach(function (el) {
        el.title = '點擊放大';
        el.addEventListener('click', function () {
            const svg = el.querySelector('svg');
            if (svg) {
                const clone = svg.cloneNode(true);

                // Calculate zoom size
                const viewBox = svg.getAttribute('viewBox');
                let svgWidth, svgHeight;

                if (viewBox) {
                    const parts = viewBox.split(' ');
                    svgWidth = parseFloat(parts[2]);
                    svgHeight = parseFloat(parts[3]);
                } else {
                    svgWidth = svg.getBoundingClientRect().width;
                    svgHeight = svg.getBoundingClientRect().height;
                }

                const maxW = window.innerWidth * 0.92;
                const maxH = window.innerHeight * 0.88;
                const ratio = svgWidth / svgHeight;

                let newWidth, newHeight;
                if (maxW / maxH > ratio) {
                    newHeight = maxH;
                    newWidth = newHeight * ratio;
                } else {
                    newWidth = maxW;
                    newHeight = newWidth / ratio;
                }

                clone.removeAttribute('width');
                clone.removeAttribute('height');
                clone.removeAttribute('style');
                clone.style.width = newWidth + 'px';
                clone.style.height = newHeight + 'px';
                clone.style.maxWidth = 'none';
                clone.style.maxHeight = 'none';

                modal.querySelector('.mermaid-modal-body').innerHTML = '';
                modal.querySelector('.mermaid-modal-body').appendChild(clone);
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });
}

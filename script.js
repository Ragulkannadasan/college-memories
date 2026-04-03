document.addEventListener('DOMContentLoaded', () => {
    const fileGrid = document.getElementById('file-grid');
    const breadcrumbsUI = document.getElementById('breadcrumbs');
    
    // Lightbox Elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
    const lightboxYoutube = document.getElementById('lightbox-youtube');
    const lightboxDownload = document.getElementById('lightbox-download');
    const closeBtn = document.getElementById('close-lightbox');

    // Sidebar & Topbar Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const menuToggle = document.getElementById('menu-toggle');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebarLinks = document.querySelectorAll('#sidebar-nav a');
    const searchInput = document.getElementById('search-input');

    let allFiles = []; 
    let currentFolderId = null; 
    let breadcrumbPath = [{ id: null, name: 'Home' }];
    let activeFilter = 'all'; // all | image | video

    // ---- UTILITY FUNCTION TO CONVERT RELATIVE PATHS TO ABSOLUTE URLs ----
    function getAbsoluteUrl(url) {
        // If it's already an absolute URL (http/https), return as-is
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        // Get the directory of the current page (remove filename if present)
        let pathname = window.location.pathname;
        if (!pathname.endsWith('/')) {
            pathname = pathname.substring(0, pathname.lastIndexOf('/')) + '/';
        }
        
        // Convert relative path to absolute URL
        const baseUrl = window.location.protocol + '//' + window.location.host + pathname;
        return baseUrl + url;
    }

    // ---- TAGS + SEARCH HELPERS ----
    function normalizeText(value) {
        return (value || '').toString().toLowerCase().trim();
    }

    function getItemTags(item) {
        if (!item || !Array.isArray(item.tags)) return [];
        return item.tags.map((t) => normalizeText(t)).filter(Boolean);
    }

    function itemMatchesQuery(item, tokens) {
        if (!tokens.length) return true;
        const haystack = normalizeText(item?.name);
        const tags = getItemTags(item);
        return tokens.every((tok) => haystack.includes(tok) || tags.some((t) => t.includes(tok)));
    }

    function currentViewItems() {
        if (activeFilter === 'image') {
            return allFiles.filter((item) => item.type === 'image');
        }
        if (activeFilter === 'video') {
            return allFiles.filter((item) => item.type === 'video' || item.type === 'youtube');
        }
        return allFiles.filter((item) => item.parentId === currentFolderId);
    }

    function renderCurrentView() {
        if (activeFilter === 'all') return renderFolderView();
        if (activeFilter === 'image') return renderFlatTypeView('image', null, 'Photos');
        if (activeFilter === 'video') return renderFlatTypeView('video', 'youtube', 'Videos');
    }

    // FETCH DATA FROM JSON FILE
    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then(data => {
            allFiles = data;
            renderCurrentView();
        })
        .catch(error => {
            console.error("Error loading data:", error);
            fileGrid.innerHTML = `<div class="empty-state">Error loading files. Ensure you are running a local server.</div>`;
        });

    // ---- UI RENDERING LOGIC ----

    function renderBreadcrumbs(overrideTitle = null) {
        breadcrumbsUI.innerHTML = '';
        
        if (overrideTitle) {
            breadcrumbsUI.innerHTML = `<li><span class="current">${overrideTitle}</span></li>`;
            return;
        }

        breadcrumbPath.forEach((crumb, index) => {
            const li = document.createElement('li');
            
            if (index === breadcrumbPath.length - 1) {
                li.innerHTML = `<span class="current">${crumb.name}</span>`;
            } else {
                const a = document.createElement('a');
                a.textContent = crumb.name;
                a.addEventListener('click', () => navigateToBreadcrumb(index));
                li.appendChild(a);
            }
            breadcrumbsUI.appendChild(li);
        });
    }

    function renderFolderView() {
        renderBreadcrumbs();
        fileGrid.innerHTML = '';
        
        const currentItems = allFiles.filter(item => item.parentId === currentFolderId);

        if (currentItems.length === 0) {
            fileGrid.innerHTML = `<div class="empty-state">This folder is empty.</div>`;
            return;
        }

        // Pass index for staggered entrance animation
        currentItems.forEach((item, index) => fileGrid.appendChild(createCardElement(item, index)));
    }

    function renderFlatTypeView(fileType1, fileType2, title) {
        renderBreadcrumbs(title);
        fileGrid.innerHTML = '';

        const currentItems = allFiles.filter(item => item.type === fileType1 || item.type === fileType2);

        if (currentItems.length === 0) {
            fileGrid.innerHTML = `<div class="empty-state">No ${title.toLowerCase()} found.</div>`;
            return;
        }

        // Pass index for staggered entrance animation
        currentItems.forEach((item, index) => fileGrid.appendChild(createCardElement(item, index)));
    }

    // ---- SEARCH LOGIC (FOLDERS ONLY) ----
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = normalizeText(e.target.value);
        
        if (searchTerm === '') {
            renderCurrentView();
            return;
        }

        const tokens = searchTerm.split(/\s+/).filter(Boolean);
        renderBreadcrumbs(`Search results for "${searchTerm}"`);
        fileGrid.innerHTML = '';

        const searchResults = currentViewItems().filter((item) => itemMatchesQuery(item, tokens));

        if (searchResults.length === 0) {
            fileGrid.innerHTML = `<div class="empty-state">No results match "${searchTerm}".</div>`;
            return;
        }

        searchResults.forEach((item, index) => fileGrid.appendChild(createCardElement(item, index)));
    });

    // ---- CARD CREATION (WITH STAGGERED DELAY) ----

    function createCardElement(item, index = 0) {
        const card = document.createElement('div');
        card.classList.add('card', item.type);

        // Calculate staggered delay (e.g., 0s, 0.05s, 0.10s)
        card.style.animationDelay = `${index * 0.05}s`;

        if (item.type === 'folder') {
            card.innerHTML = `
                <div class="icon-container"><span class="material-icons-round">folder</span></div>
                <span class="card-name">${item.name}</span>
            `;
            card.addEventListener('click', () => {
                searchInput.value = ''; 
                openFolder(item);
            });
        } 
        else if (item.type === 'image') {
            card.innerHTML = `
                <img src="${item.url}" alt="${item.name}">
                <div class="overlay">${item.name}</div>
            `;
            card.addEventListener('click', () => openLightbox(item));
        } 
        else if (item.type === 'video' || item.type === 'youtube') {
            card.innerHTML = `
                <div class="icon-container"><span class="material-icons-round">play_circle_filled</span></div>
                <span class="card-name">${item.name}</span>
            `;
            card.addEventListener('click', () => openLightbox(item));
        }
        return card;
    }

    // ---- NAVIGATION LOGIC ----

    function openFolder(folder) {
        currentFolderId = folder.id;
        reconstructDirectoryPath(folder.id);
        renderFolderView();
    }

    function reconstructDirectoryPath(folderId) {
        const path = [];
        let currentId = folderId;

        while (currentId !== null) {
            const folder = allFiles.find(f => f.id === currentId);
            if (folder) {
                path.unshift({ id: folder.id, name: folder.name });
                currentId = folder.parentId;
            } else {
                break;
            }
        }
        
        path.unshift({ id: null, name: 'Home' });
        breadcrumbPath = path;
    }

    function navigateToBreadcrumb(index) {
        searchInput.value = ''; 
        breadcrumbPath = breadcrumbPath.slice(0, index + 1);
        currentFolderId = breadcrumbPath[breadcrumbPath.length - 1].id;
        renderFolderView();
    }

    // ---- SIDEBAR FILTERING ----

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            searchInput.value = '';
            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            closeMobileSidebar();

            const filterType = link.getAttribute('data-filter');

            if (filterType === 'all') {
                activeFilter = 'all';
                currentFolderId = null;
                breadcrumbPath = [{ id: null, name: 'Home' }];
                renderFolderView();
            } else if (filterType === 'image') {
                activeFilter = 'image';
                renderFlatTypeView('image', null, 'Photos');
            } else if (filterType === 'video') {
                activeFilter = 'video';
                renderFlatTypeView('video', 'youtube', 'Videos');
            }
        });
    });

    // ---- MOBILE SIDEBAR TOGGLE ----
    
    function openMobileSidebar() {
        sidebar.classList.add('show');
        sidebarOverlay.classList.add('show');
    }

    function closeMobileSidebar() {
        sidebar.classList.remove('show');
        sidebarOverlay.classList.remove('show');
    }

    menuToggle.addEventListener('click', openMobileSidebar);
    closeSidebarBtn.addEventListener('click', closeMobileSidebar);
    sidebarOverlay.addEventListener('click', closeMobileSidebar);

    // ---- LIGHTBOX & SMART DOWNLOAD LOGIC ----
    
    function openLightbox(item) {
        // Reset displays
        lightboxImg.style.display = 'none';
        lightboxVideo.style.display = 'none';
        lightboxYoutube.style.display = 'none';
        lightboxDownload.style.display = 'flex';

        lightboxDownload.dataset.filename = item.name;

        if (item.type === 'image') {
            // Prioritize high-res downloadUrl if it exists, otherwise fallback to compressed url
            lightboxDownload.dataset.url = getAbsoluteUrl(item.downloadUrl || item.url);
            lightboxImg.src = item.url;
            lightboxImg.style.display = 'block';
        } 
        else if (item.type === 'video') {
            lightboxDownload.dataset.url = getAbsoluteUrl(item.url);
            lightboxVideo.src = item.url;
            lightboxVideo.style.display = 'block';
            lightboxVideo.play();
        }
        else if (item.type === 'youtube') {
            // HYBRID LOGIC: If a downloadUrl exists (GitHub path), show the button
            if (item.downloadUrl) {
                lightboxDownload.style.display = 'flex';
                lightboxDownload.dataset.url = getAbsoluteUrl(item.downloadUrl);
            } else {
                lightboxDownload.style.display = 'none';
            }
            
            lightboxYoutube.src = item.url.includes('?') ? item.url + '&autoplay=1' : item.url + '?autoplay=1';
            lightboxYoutube.style.display = 'block';
        }
        
        lightbox.classList.add('active');
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        
        // Slight delay matches the CSS fade-out animation before wiping sources
        setTimeout(() => {
            lightboxImg.src = '';
            lightboxVideo.pause();
            lightboxVideo.src = '';
            lightboxYoutube.src = ''; 
            lightboxDownload.dataset.url = ''; 
        }, 300);
    }

    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');

    function showNotification(message = 'Processing...') {
        notificationText.textContent = message;
        notification.classList.add('show');
    }

    function hideNotification() {
        notification.classList.remove('show');
    }

    lightboxDownload.addEventListener('click', async (e) => {
        // Prevent the browser from trying to navigate or save the HTML page
        e.preventDefault(); 
        
        const fileUrl = lightboxDownload.dataset.url;
        const fileName = lightboxDownload.dataset.filename;

        if (!fileUrl) return;

        showNotification('Processing...');

        // Use fetch + blob for all media files to ensure full content is downloaded
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch(fileUrl, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Accept': '*/*'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }
            
            // Check content length header
            const contentLength = response.headers.get('content-length');
            console.log(`Expected file size: ${contentLength} bytes`);
            
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            // Log file size for debugging
            console.log(`Downloaded file: ${fileName}, size: ${blob.size} bytes`);
            
            // Verify the blob size matches expected content length
            if (contentLength && parseInt(contentLength) !== blob.size) {
                console.warn(`Size mismatch! Expected: ${contentLength}, Got: ${blob.size}`);
            }
            
            const tempLink = document.createElement('a');
            tempLink.style.display = 'none';
            tempLink.href = blobUrl;
            tempLink.setAttribute('download', fileName || 'download');
            
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
            
            window.URL.revokeObjectURL(blobUrl);
            showNotification('Download complete!');
            setTimeout(hideNotification, 1500);
        } catch (error) {
            console.error("Download failed:", error);
            console.error("Attempted URL:", fileUrl);
            
            if (error.name === 'AbortError') {
                showNotification('Download timed out! Try again.');
            } else {
                showNotification('Download failed! Check console.');
            }
            
            setTimeout(hideNotification, 3000);
            // Fallback: try standard download if fetch fails (e.g., cross-origin issues)
            const fallbackLink = document.createElement('a');
            fallbackLink.href = fileUrl;
            fallbackLink.setAttribute('download', fileName);
            fallbackLink.click();
        }
    });

    closeBtn.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
});
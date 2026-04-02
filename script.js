document.addEventListener('DOMContentLoaded', () => {
    const fileGrid = document.getElementById('file-grid');
    const breadcrumbsUI = document.getElementById('breadcrumbs');
    
    // Lightbox Elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
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

    // FETCH DATA FROM JSON FILE
    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then(data => {
            allFiles = data;
            renderFolderView();
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

        currentItems.forEach(item => fileGrid.appendChild(createCardElement(item)));
    }

    function renderFlatTypeView(fileType, title) {
        renderBreadcrumbs(title);
        fileGrid.innerHTML = '';

        const currentItems = allFiles.filter(item => item.type === fileType);

        if (currentItems.length === 0) {
            fileGrid.innerHTML = `<div class="empty-state">No ${title.toLowerCase()} found.</div>`;
            return;
        }

        currentItems.forEach(item => fileGrid.appendChild(createCardElement(item)));
    }

    // ---- SEARCH LOGIC (FOLDERS ONLY) ----
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            renderFolderView();
            return;
        }

        renderBreadcrumbs(`Search results for folders matching "${searchTerm}"`);
        fileGrid.innerHTML = '';

        const searchResults = allFiles.filter(item => 
            item.type === 'folder' && item.name.toLowerCase().includes(searchTerm)
        );

        if (searchResults.length === 0) {
            fileGrid.innerHTML = `<div class="empty-state">No folders match "${searchTerm}".</div>`;
            return;
        }

        searchResults.forEach(item => fileGrid.appendChild(createCardElement(item)));
    });

    // ---- CARD CREATION ----

    function createCardElement(item) {
        const card = document.createElement('div');
        card.classList.add('card', item.type);

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
        else if (item.type === 'video') {
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
                currentFolderId = null;
                breadcrumbPath = [{ id: null, name: 'Home' }];
                renderFolderView();
            } else if (filterType === 'image') {
                renderFlatTypeView('image', 'Photos');
            } else if (filterType === 'video') {
                renderFlatTypeView('video', 'Videos');
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

    // ---- LIGHTBOX & FORCED DOWNLOAD LOGIC ----
    
    function openLightbox(item) {
        // Store data instead of directly modifying href to prevent the code download bug
        lightboxDownload.dataset.url = item.url;
        lightboxDownload.dataset.filename = item.name;

        if (item.type === 'image') {
            lightboxImg.src = item.url;
            lightboxImg.style.display = 'block';
            lightboxVideo.style.display = 'none';
            lightboxVideo.src = '';
        } else if (item.type === 'video') {
            lightboxVideo.src = item.url;
            lightboxVideo.style.display = 'block';
            lightboxImg.style.display = 'none';
            lightboxImg.src = '';
            lightboxVideo.play();
        }
        lightbox.classList.add('active');
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        lightboxImg.src = '';
        lightboxVideo.pause();
        lightboxVideo.src = '';
        lightboxDownload.dataset.url = ''; 
    }

    // Force Download Media (Fixes HTML code download issue)
    lightboxDownload.addEventListener('click', async (e) => {
        e.preventDefault(); // Stop default browser saving behavior
        
        const fileUrl = lightboxDownload.dataset.url;
        const fileName = lightboxDownload.dataset.filename;

        if (!fileUrl) return;

        try {
            // Fetch the media file
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            
            // Create a temporary object URL
            const blobUrl = window.URL.createObjectURL(blob);
            
            // Create an invisible anchor to force the file download
            const tempLink = document.createElement('a');
            tempLink.style.display = 'none';
            tempLink.href = blobUrl;
            tempLink.download = fileName;
            
            // Append, click, and clean up
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
            
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download the file.");
        }
    });

    closeBtn.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
});
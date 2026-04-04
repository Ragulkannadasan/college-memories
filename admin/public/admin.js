document.addEventListener('DOMContentLoaded', () => {
    let allItems = [];
    let currentFolderId = null;
    let selectedItem = null;

    const fileGrid = document.getElementById('file-grid');
    const folderNav = document.getElementById('folder-nav');
    const breadcrumbs = document.getElementById('breadcrumbs');
    
    // Dropdowns
    const adminSortSelect = document.getElementById('admin-sort-select');
    const adminFilterSelect = document.getElementById('admin-filter-select');
    
    // Context Menu Elements
    const contextMenu = document.getElementById('context-menu');
    const menuRename = document.getElementById('menu-rename');
    const menuCopy = document.getElementById('menu-copy');
    const menuMove = document.getElementById('menu-move');
    const menuFav = document.getElementById('menu-fav');
    const menuDelete = document.getElementById('menu-delete');

    // Modals
    const modalRename = document.getElementById('modal-rename');
    const renameInput = document.getElementById('rename-input');
    const btnRenameSave = document.getElementById('btn-rename-save');
    const btnRenameCancel = document.getElementById('btn-rename-cancel');

    const modalMove = document.getElementById('modal-move');
    const moveSelect = document.getElementById('move-select');
    const btnMoveSave = document.getElementById('btn-move-save');
    const btnMoveCancel = document.getElementById('btn-move-cancel');

    const modalCopy = document.getElementById('modal-copy');
    const copySelect = document.getElementById('copy-select');
    const btnCopySave = document.getElementById('btn-copy-save');
    const btnCopyCancel = document.getElementById('btn-copy-cancel');

    // Toast
    const toast = document.getElementById('toast');
    function showToast(msg, bg = '#10B981') {
        toast.textContent = msg;
        toast.style.background = bg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Fetch Data
    function loadData() {
        fetch('/api/items')
            .then(res => res.json())
            .then(data => {
                allItems = data;
                renderFolders();
                renderGrid();
                populateMoveSelect();
            });
    }

    // Render Folders in Sidebar
    function renderFolders() {
        const folders = allItems.filter(i => i.type === 'folder' || i.type === 'youtube'); // keeping youtube as simple files mostly, but if we treat youtube as folders visually we shouldn't here. Wait, college-memories original code doesn't treat youtube as folders. Only folder is folder.
        const pureFolders = allItems.filter(i => i.type === 'folder');
        
        folderNav.innerHTML = `<a href="#" class="${currentFolderId === null ? 'active' : ''}" data-id="null"><span class="material-icons-round">home</span> Root / Home</a>`;
        
        pureFolders.forEach(folder => {
            const a = document.createElement('a');
            a.href = '#';
            a.className = currentFolderId === folder.id ? 'active' : '';
            a.dataset.id = folder.id;
            a.innerHTML = `<span class="material-icons-round">folder</span> ${folder.name}`;
            folderNav.appendChild(a);
        });
        
        document.querySelectorAll('#folder-nav a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                currentFolderId = a.dataset.id === 'null' ? null : parseInt(a.dataset.id);
                renderGrid();
                renderFolders(); // to update active state
            });
        });
    }

    function populateMoveSelect() {
        const folders = allItems.filter(i => i.type === 'folder');
        moveSelect.innerHTML = `<option value="null">Root / Home</option>`;
        copySelect.innerHTML = `<option value="null">Root / Home</option>`;
        folders.forEach(f => {
            const opt = `<option value="${f.id}">📁 ${f.name}</option>`;
            moveSelect.innerHTML += opt;
            copySelect.innerHTML += opt;
        });
    }

    function renderGrid() {
        fileGrid.innerHTML = '';
        let itemsToView = allItems.filter(i => i.parentId === currentFolderId);
        
        // --- FILTER & SORT LOGIC ---
        const filterVal = adminFilterSelect ? adminFilterSelect.value : 'all';
        if (filterVal === 'image') itemsToView = itemsToView.filter(item => item.type === 'image');
        else if (filterVal === 'video') itemsToView = itemsToView.filter(item => item.type === 'video' || item.type === 'youtube');
        else if (filterVal === 'favorite') itemsToView = itemsToView.filter(item => item.tags && item.tags.includes('favorite'));

        const sortVal = adminSortSelect ? adminSortSelect.value : 'id-asc';
        itemsToView.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (b.type === 'folder' && a.type !== 'folder') return 1;

            if (sortVal === 'id-asc') return a.id - b.id;
            if (sortVal === 'id-desc') return b.id - a.id;
            
            const nameA = a.displayName ? a.displayName.toLowerCase() : a.name.toLowerCase();
            const nameB = b.displayName ? b.displayName.toLowerCase() : b.name.toLowerCase();
            if (sortVal === 'name-asc') return nameA.localeCompare(nameB);
            if (sortVal === 'name-desc') return nameB.localeCompare(nameA);
            
            return 0;
        });
        
        // Update breadcrumbs
        if (currentFolderId === null) {
            breadcrumbs.innerHTML = `<span>Root</span>`;
        } else {
            const f = allItems.find(i => i.id === currentFolderId);
            breadcrumbs.innerHTML = `<span>Root / ${f ? f.name : ''}</span>`;
        }

        if (itemsToView.length === 0) {
            fileGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Folder is empty</div>';
            return;
        }

        itemsToView.forEach(item => {
            const card = document.createElement('div');
            card.className = `card ${item.type}`;
            card.dataset.id = item.id;
            
            const isFav = item.tags && item.tags.includes('favorite');
            const favHtml = isFav ? `<div class="fav-badge"><span class="material-icons-round" style="font-size:16px;">favorite</span></div>` : '';
            const displayName = item.displayName || item.name;

            if (item.type === 'folder') {
                card.innerHTML = `
                    <div class="icon-container"><span class="material-icons-round">folder</span></div>
                    <span class="card-name">${displayName}</span>
                    ${favHtml}
                `;
                card.addEventListener('dblclick', () => {
                    currentFolderId = item.id;
                    renderFolders();
                    renderGrid();
                });
            } else if (item.type === 'image') {
                card.innerHTML = `
                    <img src="${item.url}" alt="${displayName}">
                    <div class="overlay">${displayName}</div>
                    ${favHtml}
                `;
            } else {
                card.innerHTML = `
                    <div class="icon-container"><span class="material-icons-round">play_circle_filled</span></div>
                    <span class="card-name">${displayName}</span>
                    ${favHtml}
                `;
            }

            const menuBtn = document.createElement('div');
            menuBtn.className = 'card-menu-btn';
            menuBtn.innerHTML = '<span class="material-icons-round">more_vert</span>';
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                selectedItem = item;
                
                contextMenu.style.top = `${e.clientY}px`;
                contextMenu.style.left = `${e.clientX}px`;
                contextMenu.classList.add('active');
            });
            card.appendChild(menuBtn);

            // Context Menu Event
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                selectedItem = item;
                
                contextMenu.style.top = `${e.clientY}px`;
                contextMenu.style.left = `${e.clientX}px`;
                contextMenu.classList.add('active');
            });

            fileGrid.appendChild(card);
        });
    }

    // Hide context menu on global click
    document.addEventListener('click', () => contextMenu.classList.remove('active'));

    // --- Actions ---
    menuRename.addEventListener('click', () => {
        renameInput.value = selectedItem.displayName || selectedItem.name;
        modalRename.classList.add('active');
    });

    btnRenameCancel.addEventListener('click', () => modalRename.classList.remove('active'));
    btnRenameSave.addEventListener('click', () => {
        const newName = renameInput.value.trim();
        if(!newName) return;
        fetch(`/api/items/${selectedItem.id}/rename`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: newName })
        }).then(res => res.json()).then(data => {
            if(data.success) {
                modalRename.classList.remove('active');
                showToast('Renamed successfully');
                loadData();
            }
        });
    });

    menuMove.addEventListener('click', () => {
        moveSelect.value = selectedItem.parentId === null ? 'null' : selectedItem.parentId;
        // Don't allow a folder to move into itself
        Array.from(moveSelect.options).forEach(opt => {
            opt.disabled = opt.value == selectedItem.id;
        });
        modalMove.classList.add('active');
    });

    btnMoveCancel.addEventListener('click', () => modalMove.classList.remove('active'));
    btnMoveSave.addEventListener('click', () => {
        const newParentId = moveSelect.value === 'null' ? null : parseInt(moveSelect.value);
        fetch(`/api/items/${selectedItem.id}/move`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ parentId: newParentId })
        }).then(res => res.json()).then(data => {
            if(data.success) {
                modalMove.classList.remove('active');
                showToast('Moved successfully');
                loadData();
            }
        });
    });

    menuCopy.addEventListener('click', () => {
        copySelect.value = selectedItem.parentId === null ? 'null' : selectedItem.parentId;
        // Don't allow a folder to copy into itself recursively infinitely
        Array.from(copySelect.options).forEach(opt => {
            opt.disabled = opt.value == selectedItem.id;
        });
        modalCopy.classList.add('active');
    });

    btnCopyCancel.addEventListener('click', () => modalCopy.classList.remove('active'));
    btnCopySave.addEventListener('click', () => {
        const newParentId = copySelect.value === 'null' ? null : parseInt(copySelect.value);
        showToast('Copying...', '#f59e0b');
        fetch(`/api/items/${selectedItem.id}/copy`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ parentId: newParentId })
        }).then(res => res.json()).then(data => {
            if(data.success) {
                modalCopy.classList.remove('active');
                showToast('Copied successfully');
                loadData();
            } else {
                showToast('Error copying', 'var(--danger)');
            }
        }).catch(() => {
            showToast('Error copying', 'var(--danger)');
        });
    });

    menuFav.addEventListener('click', () => {
        let tags = selectedItem.tags || [];
        if (tags.includes('favorite')) {
            tags = tags.filter(t => t !== 'favorite');
        } else {
            tags.push('favorite');
        }
        
        fetch(`/api/items/${selectedItem.id}/tags`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ tags })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                showToast(tags.includes('favorite') ? 'Added to favorites' : 'Removed from favorites');
                loadData();
            }
        });
    });

    menuDelete.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete ${selectedItem.displayName || selectedItem.name} and its contents?`)) {
            fetch(`/api/items/${selectedItem.id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    showToast(`Deleted ${data.deletedCount} item(s)`);
                    loadData();
                }
            });
        }
    });

    // Add Folder
    document.getElementById('btn-add-folder').addEventListener('click', () => {
        const fname = prompt("Enter new folder name:");
        if (fname && fname.trim()) {
            fetch('/api/folders', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name: fname.trim(), parentId: currentFolderId })
            }).then(r=>r.json()).then(() => {
                showToast("Folder created");
                loadData();
            });
        }
    });

    // Upload
    const btnUpload = document.getElementById('btn-upload');
    const fileUpload = document.getElementById('file-upload');

    btnUpload.addEventListener('click', () => fileUpload.click());

    fileUpload.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files.length) return;
        
        showToast('Uploading...', '#f59e0b');
        let successCount = 0;

        for(let file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('parentId', currentFolderId);

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) successCount++;
            } catch(err) {
                console.error(err);
            }
        }
        
        fileUpload.value = '';
        showToast(`Uploaded ${successCount}/${files.length} file(s)`);
        loadData();
    });

    // Check Duplicates Diagnostic
    const btnCheckDupes = document.getElementById('btn-check-dupes');
    const modalDuplicates = document.getElementById('modal-duplicates');
    const btnDupesClose = document.getElementById('btn-dupes-close');
    const duplicatesResults = document.getElementById('duplicates-results');

    btnCheckDupes.addEventListener('click', async () => {
        showToast('Scanning database...', '#3b82f6');
        try {
            const res = await fetch('/api/duplicates');
            const data = await res.json();
            
            if (data.success) {
                if (data.dupIds.length === 0 && data.dupUrls.length === 0 && data.dupNames.length === 0) {
                    showToast('✅ Database is 100% clean! Zero duplicates.');
                    return;
                }

                // Format the diagnostic report
                let reportHtml = '';

                if (data.dupIds.length > 0) {
                    reportHtml += `<strong style="color:#ef4444;">🚨 Duplicate IDs:</strong><br>`;
                    data.dupIds.forEach(d => reportHtml += `ID [${d.id}]: ${d.files.join(', ')}<br>`);
                    reportHtml += `<br>`;
                }

                if (data.dupUrls.length > 0) {
                    reportHtml += `<strong style="color:#f59e0b;">📁 Duplicate Internal Files/URLs:</strong><br>`;
                    data.dupUrls.forEach(d => reportHtml += `URL [${d.url}] shared by IDs: ${d.ids.join(', ')}<br>`);
                    reportHtml += `<br>`;
                }

                if (data.dupNames.length > 0) {
                    reportHtml += `<strong style="color:#3b82f6;">🖼️ Original Image Overlap:</strong><span style="font-size:0.8em;display:block;">(You likely uploaded the same original file multiple times)</span>`;
                    data.dupNames.forEach(d => reportHtml += `"${d.originalName}" imported as: ${d.generatedNames.join(', ')}<br>`);
                }

                duplicatesResults.innerHTML = reportHtml;
                modalDuplicates.classList.add('active');
            }
        } catch (err) {
            console.error(err);
            showToast('Error checking duplicates', 'var(--danger)');
        }
    });

    btnDupesClose.addEventListener('click', () => modalDuplicates.classList.remove('active'));

    // Event Bindings for Sort/Filter
    if (adminSortSelect) adminSortSelect.addEventListener('change', renderGrid);
    if (adminFilterSelect) adminFilterSelect.addEventListener('change', renderGrid);

    // Init
    loadData();
});

# MPC Archive - College Memories Gallery

A beautiful, responsive photo and video gallery for college memories with direct email contact.

## Features

- 📸 Photo and video gallery with folder organization
- 🔍 Search functionality
- 📱 Responsive design
- 📧 Direct email contact link
- 🖼️ Lightbox viewer
- 📁 Folder navigation
- 🎯 Smart filtering (Photos/Videos)

## User Contact Feature

Users can contact you directly via email by clicking the "Contact" link in the sidebar. This opens their default email client with your address pre-filled.

## Setup Instructions

### 1. Deploy to GitHub Pages

1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Select "Deploy from a branch" and choose your main branch
4. Your site will be available at `https://yourusername.github.io/repository-name`

### 2. Process Media (Optional)

If you have new images/videos to add:

```bash
# Place files in the 'uploads/' folder
npm run process-media
```

## Project Structure

```
college-memories/
├── index.html            # Main gallery interface
├── script.js             # Frontend JavaScript
├── style.css             # Styling
├── data.json             # Gallery data
├── add-media.js          # Media processing script
├── clean-data.js         # Data cleanup script
├── package.json          # Dependencies
├── assets/               # Static assets (icons, etc.)
├── data/                 # Processed media files
│   ├── compressed/       # Compressed images
│   └── raw/             # Original files
└── uploads/             # Place new files here
```

## Development

The application uses:
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Contact:** Direct mailto: link
- **Image Processing:** Sharp

## License

ISC
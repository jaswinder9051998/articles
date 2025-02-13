document.addEventListener('DOMContentLoaded', async () => {
    const cardsContainer = document.getElementById('cardsContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Get the API base URL from environment or use default
    const API_BASE_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000'
        : 'https://your-articles.onrender.com'; // Replace with your Render.com URL
    
    // Function to read and parse the article_summary.txt file
    async function fetchArticleSummaries() {
        try {
            // Get article summaries directly
            const response = await fetch(`${API_BASE_URL}/get_article_summary`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            
            // Split the text into individual article sections
            const articles = text.split('=' .repeat(80))
                .filter(article => article.trim() !== '');
            
            return articles.map(article => {
                const lines = article.split('\n').filter(line => line.trim());
                const articleData = {
                    title: '',
                    url: '',
                    keyTakeaway: '',
                    mainPoints: [],
                    quote: ''
                };
                
                let currentSection = '';
                let currentContent = '';
                
                lines.forEach(line => {
                    if (line.includes('ARTICLE TITLE:')) {
                        articleData.title = line.replace('📰 ARTICLE TITLE:', '').trim();
                    } else if (line.includes('Read Full Article:')) {
                        articleData.url = line.replace('🔗 Read Full Article:', '').trim();
                    } else if (line.includes('KEY TAKEAWAY')) {
                        currentSection = 'keyTakeaway';
                    } else if (line.includes('MAIN POINTS')) {
                        currentSection = 'mainPoints';
                        currentContent = '';
                    } else if (line.includes('NOTABLE QUOTE')) {
                        currentSection = 'quote';
                        if (currentContent) {
                            articleData.keyTakeaway = currentContent.trim();
                        }
                        currentContent = '';
                    } else if (line.trim() && !line.includes('Summary:')) {
                        switch (currentSection) {
                            case 'keyTakeaway':
                                currentContent += ' ' + line.trim();
                                break;
                            case 'mainPoints':
                                if (line.startsWith('Q:')) {
                                    articleData.mainPoints.push({
                                        question: line.replace('Q:', '').trim(),
                                        answer: ''
                                    });
                                } else if (line.startsWith('A:') && articleData.mainPoints.length > 0) {
                                    articleData.mainPoints[articleData.mainPoints.length - 1].answer = 
                                        line.replace('A:', '').trim();
                                }
                                break;
                            case 'quote':
                                articleData.quote += ' ' + line.trim();
                                break;
                        }
                    }
                });
                
                return articleData;
            }).filter(article => article.title && article.url); // Only return articles with title and URL
        } catch (error) {
            console.error('Error fetching article summaries:', error);
            return [];
        }
    }
    
    // Function to create a card element
    function createCard(article) {
        const card = document.createElement('div');
        card.className = 'card';
        
        // Add click event to open article in new tab
        card.addEventListener('click', (e) => {
            // Don't open article if clicking show more/less button
            if (e.target.classList.contains('show-more-btn')) {
                e.stopPropagation();
                return;
            }
            window.open(article.url, '_blank');
        });
        
        // Limit main points to first 2 questions initially
        const initialPoints = article.mainPoints.slice(0, 2);
        const remainingPoints = article.mainPoints.slice(2);
        const hasMorePoints = remainingPoints.length > 0;
        
        // Create card content
        card.innerHTML = `
            <h3 class="card-title">${article.title}</h3>
            <div class="card-content">
                <div class="key-takeaway">
                    <strong>🎯 Key Takeaway:</strong><br>
                    ${article.keyTakeaway}
                </div>
                <div class="qa-section">
                    ${initialPoints.map(point => `
                        <div class="qa-pair">
                            <p class="question">Q: ${point.question}</p>
                            <p class="answer">A: ${point.answer}</p>
                        </div>
                    `).join('')}
                    ${hasMorePoints ? `
                        <div class="remaining-points" style="display: none;">
                            ${remainingPoints.map(point => `
                                <div class="qa-pair">
                                    <p class="question">Q: ${point.question}</p>
                                    <p class="answer">A: ${point.answer}</p>
                                </div>
                            `).join('')}
                        </div>
                        <button class="show-more-btn">Show ${remainingPoints.length} more questions</button>
                    ` : ''}
                </div>
                ${article.quote ? `
                    <div class="quote">
                        <strong>💬 Notable Quote:</strong><br>
                        ${article.quote}
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add event listener for show more/less button if it exists
        const showMoreBtn = card.querySelector('.show-more-btn');
        if (showMoreBtn) {
            showMoreBtn.addEventListener('click', () => {
                const remainingPoints = card.querySelector('.remaining-points');
                const isHidden = remainingPoints.style.display === 'none';
                remainingPoints.style.display = isHidden ? 'block' : 'none';
                showMoreBtn.textContent = isHidden ? 'Show less' : `Show ${remainingPoints.children.length} more questions`;
            });
        }
        
        return card;
    }
    
    // Initialize the slider
    async function initializeSlider() {
        const articles = await fetchArticleSummaries();
        
        if (articles.length === 0) {
            cardsContainer.innerHTML = '<p class="error-message">No articles found. Please check if article_summary.txt exists in the latest folder.</p>';
            return;
        }
        
        let currentIndex = 0;
        const cards = [];
        
        // Create and append cards
        articles.forEach((article, index) => {
            const card = createCard(article);
            cards.push(card);
            cardsContainer.appendChild(card);
        });

        // Function to update card positions
        function updateCardPositions() {
            cards.forEach((card, index) => {
                // Remove all position attributes
                card.removeAttribute('data-position');
                
                if (index === currentIndex) {
                    card.setAttribute('data-position', 'current');
                } else if (index === currentIndex - 1) {
                    card.setAttribute('data-position', 'prev');
                } else if (index === currentIndex + 1) {
                    card.setAttribute('data-position', 'next');
                } else if (index < currentIndex - 1) {
                    card.setAttribute('data-position', 'hidden-left');
                } else {
                    card.setAttribute('data-position', 'hidden');
                }
            });
        }

        // Initial card setup
        updateCardPositions();
        
        // Update button states
        function updateButtons() {
            prevBtn.disabled = currentIndex <= 0;
            nextBtn.disabled = currentIndex >= cards.length - 1;
        }
        
        // Slide functions
        function slideNext() {
            if (currentIndex < cards.length - 1) {
                currentIndex++;
                updateCardPositions();
                updateButtons();
            }
        }
        
        function slidePrev() {
            if (currentIndex > 0) {
                currentIndex--;
                updateCardPositions();
                updateButtons();
            }
        }
        
        // Add event listeners to buttons
        nextBtn.addEventListener('click', slideNext);
        prevBtn.addEventListener('click', slidePrev);
        
        // Initial button state
        updateButtons();
    }
    
    // Initialize the slider
    initializeSlider();
}); 
document.addEventListener('DOMContentLoaded', async () => {
    const cardsContainer = document.getElementById('cardsContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // Get the API base URL from the current window location
    const API_BASE_URL = window.location.origin;
    
    let allArticles = []; // Store all articles
    let filteredArticles = []; // Store filtered articles
    let currentSource = 'all'; // Track current filter
    
    // Function to read and parse the article_summary.txt file
    async function fetchArticleSummaries() {
        try {
            const response = await fetch(`${API_BASE_URL}/get_article_summary`, {
                method: 'GET',
                headers: {
                    'Accept': 'text/plain',
                    'Content-Type': 'text/plain',
                }
            });
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
                    quote: '',
                    source: '' // Add source field
                };
                
                let currentSection = '';
                let currentContent = '';
                
                // Process the content
                lines.forEach(line => {
                    if (line.includes('ARTICLE TITLE:')) {
                        articleData.title = line.replace('📰 ARTICLE TITLE:', '').trim();
                    } else if (line.includes('Read Full Article:')) {
                        articleData.url = line.replace('🔗 Read Full Article:', '').trim();
                        // Determine source from URL
                        if (articleData.url.includes('economist.com')) {
                            articleData.source = 'The Economist';
                        } else if (articleData.url.includes('ft.com')) {
                            articleData.source = 'Financial Times';
                        }
                        console.log('Determined source from URL:', {
                            url: articleData.url,
                            source: articleData.source
                        });
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
                    } else if (line.trim() && !line.includes('Summary:') && !line.startsWith('Source:')) {
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
            }).filter(article => article.title && article.url && article.source); // Only return articles with title, URL, and source
        } catch (error) {
            console.error('Error fetching article summaries:', error);
            return [];
        }
    }
    
    // Function to filter articles by source
    function filterArticles(source) {
        if (source === 'all') {
            return allArticles;
        }
        
        // Debug logging
        console.log('Filtering for source:', source);
        console.log('Total articles:', allArticles.length);
        
        // Get unique sources for debugging
        const uniqueSources = [...new Set(allArticles.map(a => a.source))];
        console.log('Available sources:', uniqueSources);
        
        return allArticles.filter(article => {
            const isMatch = article.source === source;
            
            // Debug logging for each comparison
            console.log('Comparing article:', {
                title: article.title,
                source: article.source,
                targetSource: source,
                isMatch: isMatch,
                sourceLength: article.source.length,
                targetLength: source.length
            });
            
            return isMatch;
        });
    }
    
    // Function to create a card element
    function createCard(article) {
        const card = document.createElement('div');
        card.className = 'card';
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove article';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click event
            
            // Find the index of this card
            const cardIndex = cards.findIndex(c => c === card);
            
            // Remove the card from the DOM and the cards array
            card.remove();
            cards.splice(cardIndex, 1);
            
            // If we removed the current card, adjust currentIndex
            if (cardIndex <= currentIndex && currentIndex > 0) {
                currentIndex--;
            }
            
            // Update positions and buttons without reassigning background colors
            if (cards.length > 0) {
                updateCardPositions();
                updateButtons();
            } else {
                // If no cards left for this source
                cardsContainer.innerHTML = '<p class="error-message">No more articles available for the selected source.</p>';
            }
            
            // Remove from allArticles array too
            const articleIndex = allArticles.findIndex(a => a.url === article.url);
            if (articleIndex !== -1) {
                allArticles.splice(articleIndex, 1);
            }
        });
        card.appendChild(removeBtn);
        
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
        const contentHtml = `
            <h3 class="card-title">${article.title}</h3>
            <div class="source-tag">${article.source}</div>
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
        card.insertAdjacentHTML('beforeend', contentHtml);
        
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
    
    // Initialize the slider with filtered articles
    async function initializeSlider(articles) {
        cardsContainer.innerHTML = ''; // Clear existing cards
        
        if (articles.length === 0) {
            cardsContainer.innerHTML = '<p class="error-message">No articles found for the selected source.</p>';
            return;
        }
        
        let currentIndex = 0;
        const cards = [];
        
        // Function to update card positions
        function updateCardPositions() {
            cards.forEach((card, index) => {
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

        // Function to update button states
        function updateButtons() {
            prevBtn.disabled = currentIndex <= 0;
            nextBtn.disabled = currentIndex >= cards.length - 1;
        }
        
        // Create and append cards
        articles.forEach((article, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            // Assign inline background color based on the original index (fixing color change on removal)
            card.style.backgroundColor = `var(--card-bg-${(index % 8) + 1})`;
            
            // Add remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.title = 'Remove article';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click event
                
                // Find the index of this card
                const cardIndex = cards.indexOf(card);
                if (cardIndex === -1) return;
                
                // Remove the card from the DOM and the cards array
                card.remove();
                cards.splice(cardIndex, 1);
                
                // If we removed the current card, adjust currentIndex
                if (cardIndex <= currentIndex && currentIndex > 0) {
                    currentIndex--;
                }
                
                // Update positions and buttons without reassigning background colors
                if (cards.length > 0) {
                    updateCardPositions();
                    updateButtons();
                } else {
                    // If no cards left for this source
                    cardsContainer.innerHTML = '<p class="error-message">No more articles available for the selected source.</p>';
                }
                
                // Remove from allArticles array too
                const articleIndex = allArticles.findIndex(a => a.url === article.url);
                if (articleIndex !== -1) {
                    allArticles.splice(articleIndex, 1);
                }
            });
            card.appendChild(removeBtn);
            
            // Add click event to open article in new tab
            card.addEventListener('click', (e) => {
                // Don't open article if clicking show more/less button or remove button
                if (e.target.classList.contains('show-more-btn') || e.target.classList.contains('remove-btn')) {
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
            const contentHtml = `
                <h3 class="card-title">${article.title}</h3>
                <div class="source-tag">${article.source}</div>
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
            card.insertAdjacentHTML('beforeend', contentHtml);
            
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
            
            cards.push(card);
            cardsContainer.appendChild(card);
        });

        // Initial setup
        updateCardPositions();
        updateButtons();
        
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
    }
    
    // Add click event listeners to filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Get selected source and update filtered articles
            currentSource = btn.dataset.source;
            filteredArticles = filterArticles(currentSource);
            
            // Reinitialize slider with filtered articles
            initializeSlider(filteredArticles);
        });
    });
    
    // Initialize the page
    async function initialize() {
        allArticles = await fetchArticleSummaries();
        filteredArticles = allArticles; // Start with all articles
        await initializeSlider(filteredArticles);
    }
    
    // Start the application
    initialize();
});
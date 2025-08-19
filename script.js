class EmailAutomationSystem {
    constructor() {
        this.templates = JSON.parse(localStorage.getItem('emailTemplates') || '{}');
        this.drafts = JSON.parse(localStorage.getItem('draftMessages') || '{}');
        this.variations = [];
        this.aiVariations = [];
        this.manualVariations = [];
        this.editingVariationIndex = -1;
        this.recipients = [];
        this.currentJobData = {};
        this.detectedRole = null;
        this.config = {};
        
        this.initializeEventListeners();
        this.loadSavedTemplates();
        this.loadSavedDrafts();
        this.loadCredentialsFromStorage();
        this.checkConfiguration();
        this.checkResumeStatus();
    }

    // Helper function to create Feather icon HTML
    icon(name) {
        return `<i data-feather="${name}"></i>`;
    }

    // Helper function to refresh Feather icons after dynamic content changes
    refreshIcons() {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    async checkResumeStatus() {
        try {
            const response = await fetch('/api/resumes/status');
            const resumeStatus = await response.json();
            this.updateResumeStatus(resumeStatus);
        } catch (error) {
            this.showLog('Failed to check resume files', 'warning');
        }
    }

    updateResumeStatus(status) {
        this.resumeStatus = status; // Store for later use
        
        const softwareStatus = document.getElementById('softwareResumeStatus');
        const dataScienceStatus = document.getElementById('dataScienceResumeStatus');
        
        // Update Software Engineering resume status
        if (status.software.exists) {
            const size = Math.round(status.software.size / 1024);
            softwareStatus.innerHTML = `${this.icon('check')} Found (${size}KB)`;
            softwareStatus.className = 'resume-value resume-found';
            softwareStatus.parentElement.className = 'resume-item found';
        } else {
            softwareStatus.innerHTML = `${this.icon('x')} Not found`;
            softwareStatus.className = 'resume-value resume-not-found';
            softwareStatus.parentElement.className = 'resume-item not-found';
        }
        
        // Update Data Science resume status
        if (status.dataScience.exists) {
            const size = Math.round(status.dataScience.size / 1024);
            dataScienceStatus.innerHTML = `${this.icon('check')} Found (${size}KB)`;
            dataScienceStatus.className = 'resume-value resume-found';
            dataScienceStatus.parentElement.className = 'resume-item found';
        } else {
            dataScienceStatus.innerHTML = `${this.icon('x')} Not found`;
            dataScienceStatus.className = 'resume-value resume-not-found';
            dataScienceStatus.parentElement.className = 'resume-item not-found';
        }
        
        // Update selected resume status
        this.updateSelectedResumeDisplay();
    }
    
    handleResumeSelectionChange(selection) {
        const customUpload = document.getElementById('customResumeUpload');
        
        if (selection === 'custom') {
            customUpload.style.display = 'block';
        } else {
            customUpload.style.display = 'none';
        }
        
        this.updateSelectedResumeDisplay();
    }
    
    updateSelectedResumeDisplay() {
        const selectedStatus = document.getElementById('selectedResumeStatus');
        const selectedValue = document.getElementById('selectedResumeValue');
        const selection = document.getElementById('resumeSelection').value;
        
        let displayText = 'None';
        let shouldShow = true;
        
        switch(selection) {
            case 'auto':
                const detectedType = this.detectedRole === 'datascience' ? 'Data Science' : 'Software Engineering';
                displayText = `Auto (${detectedType} Resume)`;
                break;
            case 'software':
                if (this.resumeStatus?.software?.exists) {
                    const size = Math.round(this.resumeStatus.software.size / 1024);
                    displayText = `Software Engineering Resume (${size}KB)`;
                } else {
                    displayText = 'Software Engineering Resume (Not Found!)';
                }
                break;
            case 'datascience':
                if (this.resumeStatus?.dataScience?.exists) {
                    const size = Math.round(this.resumeStatus.dataScience.size / 1024);
                    displayText = `Data Science Resume (${size}KB)`;
                } else {
                    displayText = 'Data Science Resume (Not Found!)';
                }
                break;
            case 'custom':
                const customFile = document.getElementById('customResumeFile').files[0];
                if (customFile) {
                    const size = Math.round(customFile.size / 1024);
                    displayText = `${customFile.name} (${size}KB)`;
                } else {
                    displayText = 'Custom Resume (Not Selected)';
                }
                break;
            case 'none':
                displayText = 'No Resume Attachment';
                break;
            default:
                shouldShow = false;
        }
        
        if (shouldShow) {
            selectedValue.textContent = displayText;
            selectedStatus.style.display = 'flex';
        } else {
            selectedStatus.style.display = 'none';
        }
        
        this.refreshIcons();
    }
    
    async handleCustomResumeUpload(file) {
        if (!file) {
            this.updateSelectedResumeDisplay();
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showLog('File too large. Maximum size is 5MB.', 'error');
            document.getElementById('customResumeFile').value = '';
            return;
        }
        
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            this.showLog('Please select a PDF, DOC, or DOCX file.', 'error');
            document.getElementById('customResumeFile').value = '';
            return;
        }
        
        this.updateSelectedResumeDisplay();
        this.showLog(`Custom resume selected: ${file.name}`, 'success');
    }
    
    getSelectedResumeInfo() {
        const selection = document.getElementById('resumeSelection').value;
        const customFile = document.getElementById('customResumeFile').files[0];
        
        return {
            type: selection,
            customFile: customFile,
            detectedRole: this.detectedRole
        };
    }

    loadCredentialsFromStorage() {
        // Load saved credentials (non-sensitive UI preferences)
        const savedResumeType = localStorage.getItem('resume_type');
        const savedResumeSelection = localStorage.getItem('resume_selection');
        
        if (savedResumeType) {
            document.getElementById('resumeType').value = savedResumeType;
        }
        
        if (savedResumeSelection) {
            document.getElementById('resumeSelection').value = savedResumeSelection;
            this.handleResumeSelectionChange(savedResumeSelection);
        }
    }

    async checkConfiguration() {
        try {
            const response = await fetch('/api/config');
            this.config = await response.json();
            this.updateConfigurationStatus();
        } catch (error) {
            this.showLog('Failed to check configuration status', 'warning');
        }
    }

    updateConfigurationStatus() {
        const aiStatus = document.getElementById('aiStatus');
        const aiType = document.getElementById('aiType');
        const emailStatus = document.getElementById('emailStatus');
        const emailType = document.getElementById('emailType');
        
        // Update AI Provider status
        if (this.config.hasAIKey) {
            aiStatus.innerHTML = `${this.icon('check')} Configured`;
            aiStatus.className = 'status-value status-configured';
            aiStatus.parentElement.className = 'status-item configured';
        } else {
            aiStatus.innerHTML = `${this.icon('x')} Missing API Key`;
            aiStatus.className = 'status-value status-not-configured';
            aiStatus.parentElement.className = 'status-item not-configured';
        }
        
        // Update AI Type
        const aiIcons = {
            claude: `${this.icon('circle')} Claude`,
            openai: `${this.icon('circle')} OpenAI`,
            gemini: `${this.icon('circle')} Gemini`
        };
        
        const aiName = aiIcons[this.config.aiProvider] || `${this.icon('circle')} Claude`;
        aiType.innerHTML = aiName;
        aiType.className = 'status-value';
        aiType.parentElement.className = 'status-item';
        
        // Update Email Provider status
        if (this.config.hasEmailConfig) {
            emailStatus.innerHTML = `${this.icon('check')} ${this.config.emailAddress}`;
            emailStatus.className = 'status-value status-configured';
            emailStatus.parentElement.className = 'status-item configured';
        } else {
            emailStatus.innerHTML = `${this.icon('x')} Missing Credentials`;
            emailStatus.className = 'status-value status-not-configured';
            emailStatus.parentElement.className = 'status-item not-configured';
        }
        
        // Update Email Type
        const emailIcons = {
            gmail: `${this.icon('circle')} Gmail`,
            outlook: `${this.icon('circle')} Outlook`,
            protonmail: `${this.icon('circle')} ProtonMail`
        };
        
        const emailName = emailIcons[this.config.emailProvider] || `${this.icon('circle')} Gmail`;
        emailType.innerHTML = emailName;
        emailType.className = 'status-value';
        emailType.parentElement.className = 'status-item';
    }

    initializeEventListeners() {
        // Auto-save non-sensitive preferences
        document.getElementById('resumeType').addEventListener('change', (e) => {
            localStorage.setItem('resume_type', e.target.value);
        });
        
        // Resume selection
        document.getElementById('resumeSelection').addEventListener('change', (e) => {
            this.handleResumeSelectionChange(e.target.value);
            localStorage.setItem('resume_selection', e.target.value);
        });
        
        // Custom resume upload
        document.getElementById('customResumeFile').addEventListener('change', (e) => {
            this.handleCustomResumeUpload(e.target.files[0]);
        });
        
        // Role detection
        document.getElementById('detectRoleBtn').addEventListener('click', () => this.detectRole());
        
        // Draft management
        document.getElementById('loadDraftBtn').addEventListener('click', () => this.toggleDraftSelector());
        document.getElementById('saveDraftBtn').addEventListener('click', () => this.saveDraft());
        document.getElementById('craftVariationsBtn').addEventListener('click', () => this.craftVariations());
        document.getElementById('addVariationBtn').addEventListener('click', () => this.addManualVariation());
        document.getElementById('manageVariationsBtn').addEventListener('click', () => this.openVariationModal());
        document.getElementById('savedDrafts').addEventListener('change', (e) => this.loadDraft(e.target.value));
        
        // Variation modal
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeVariationModal());
        document.getElementById('saveVariationBtn').addEventListener('click', () => this.saveCurrentVariation());
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.cancelEdit());
        
        // Close modal when clicking outside
        document.getElementById('variationModal').addEventListener('click', (e) => {
            if (e.target.id === 'variationModal') {
                this.closeVariationModal();
            }
        });
        
        // Template management (optional)
        document.getElementById('showTemplateBtn').addEventListener('click', () => this.toggleTemplateSection());
        document.getElementById('generateTemplateBtn').addEventListener('click', () => this.generateTemplate());
        document.getElementById('loadTemplateBtn').addEventListener('click', () => this.toggleTemplateSelector());
        document.getElementById('saveTemplateBtn').addEventListener('click', () => this.saveTemplate());
        document.getElementById('savedTemplates').addEventListener('change', (e) => this.loadTemplate(e.target.value));
        
        // CSV parsing
        document.getElementById('parseCSVBtn').addEventListener('click', () => this.handleCSVPaste());
        
        // Manual entry
        document.getElementById('addManualEntry').addEventListener('click', () => this.addManualEntry());
        const clearBtn = document.getElementById('clearManualForm');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearManualForm());
            console.log('Clear form button event listener attached');
        } else {
            console.error('Clear form button not found!');
        }
        
        // Add Enter key support for manual entry
        ['manualEmail', 'manualFirstName', 'manualLastName', 'manualPosition'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addManualEntry();
                }
            });
        });
        
        // Send emails with delay
        document.getElementById('sendEmailsBtn').addEventListener('click', () => this.startEmailReview());
    }

    detectRole() {
        const jobTitle = document.getElementById('jobTitle').value.toLowerCase();
        const draftMessage = document.getElementById('draftMessage').value.toLowerCase();
        
        if (!jobTitle && !draftMessage) {
            this.showLog('Please enter job title or draft message', 'warning');
            return;
        }

        // Role detection logic
        const softwareKeywords = ['software engineer', 'frontend', 'backend', 'full stack', 'swe', 'developer', 'react', 'javascript', 'api', 'node.js', 'web development'];
        const dataScienceKeywords = ['data scientist', 'ml engineer', 'machine learning', 'ai engineer', 'research scientist', 'tensorflow', 'pytorch', 'model', 'algorithm', 'nlp'];
        const dataAnalystKeywords = ['data analyst', 'business analyst', 'analytics', 'bi analyst', 'sql', 'tableau', 'dashboard', 'reporting', 'excel', 'power bi'];

        const text = jobTitle + ' ' + draftMessage;
        
        let role = 'unknown';
        if (softwareKeywords.some(keyword => text.includes(keyword))) {
            role = 'software';
        } else if (dataScienceKeywords.some(keyword => text.includes(keyword))) {
            role = 'datascience';
        } else if (dataAnalystKeywords.some(keyword => text.includes(keyword))) {
            role = 'dataanalyst';
        }

        this.detectedRole = role;
        const roleElement = document.getElementById('detectedRole');
        roleElement.textContent = this.getRoleDisplayName(role);
        roleElement.style.display = 'inline-block';
        
        this.showLog(`Detected role: ${this.getRoleDisplayName(role)}`, 'success');
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'software': 'Software Engineering',
            'datascience': 'Data Science',
            'dataanalyst': 'Data Analyst',
            'unknown': 'Unknown Role'
        };
        return roleNames[role] || 'Unknown Role';
    }

    async generateTemplate() {
        const jobTitle = document.getElementById('jobTitle').value;
        const companyName = document.getElementById('companyName').value;
        const draftMessage = document.getElementById('draftMessage').value;
        const resumeType = document.getElementById('resumeType').value;

        if (!jobTitle || !companyName || !draftMessage) {
            this.showLog('Please fill in all required fields', 'error');
            return;
        }

        // For now, just use the draft message as the template
        // This removes the need for AI generation and reduces spam risk
        const template = this.addSignatureToTemplate(draftMessage);
        
        document.getElementById('emailTemplate').value = template;
        this.showLog('Template created from draft message', 'success');
    }

    addSignatureToTemplate(template) {
        // Add a professional signature if not already present
        if (!template.includes('Best regards') && !template.includes('Sincerely')) {
            return template + '\n\nBest regards,\n[Your name]';
        }
        return template;
    }

    generateVariations(baseTemplate, count) {
        const variations = [];
        const synonyms = {
            'interested': ['keen on', 'excited about', 'passionate about', 'drawn to'],
            'opportunity': ['position', 'role', 'opening', 'job'],
            'experience': ['background', 'expertise', 'skills', 'knowledge'],
            'would love': ['would be thrilled', 'am eager', 'would welcome', 'am excited'],
            'discuss': ['chat about', 'talk about', 'explore', 'review'],
            'thank you': ['thanks', 'appreciate', 'grateful']
        };
        
        for (let i = 0; i < count; i++) {
            let variation = baseTemplate;
            
            // Apply random synonym replacements for variation
            Object.keys(synonyms).forEach(word => {
                if (variation.toLowerCase().includes(word) && Math.random() > 0.5) {
                    const replacement = synonyms[word][Math.floor(Math.random() * synonyms[word].length)];
                    variation = variation.replace(new RegExp(word, 'gi'), replacement);
                }
            });
            
            variations.push(variation);
        }
        
        return variations;
    }

    toggleDraftSelector() {
        const selector = document.getElementById('savedDrafts');
        selector.style.display = selector.style.display === 'none' ? 'inline-block' : 'none';
    }
    
    toggleTemplateSection() {
        const section = document.getElementById('templateSection');
        const formGroup = document.getElementById('templateFormGroup');
        const actions = document.getElementById('templateActions');
        const showBtn = document.getElementById('showTemplateBtn');
        const generateBtn = document.getElementById('generateTemplateBtn');
        const loadBtn = document.getElementById('loadTemplateBtn');
        
        if (section.classList.contains('expanded')) {
            section.classList.remove('expanded');
            formGroup.style.display = 'none';
            actions.style.display = 'none';
            generateBtn.style.display = 'none';
            loadBtn.style.display = 'none';
            showBtn.innerHTML = `${this.icon('eye')} Show Template Section`;
        } else {
            section.classList.add('expanded');
            formGroup.style.display = 'block';
            actions.style.display = 'flex';
            generateBtn.style.display = 'inline-block';
            loadBtn.style.display = 'inline-block';
            showBtn.innerHTML = `${this.icon('eye-off')} Hide Template Section`;
            this.refreshIcons();
        }
    }
    
    toggleTemplateSelector() {
        const selector = document.getElementById('savedTemplates');
        selector.style.display = selector.style.display === 'none' ? 'inline-block' : 'none';
    }

    loadSavedTemplates() {
        const selector = document.getElementById('savedTemplates');
        selector.innerHTML = '<option value="">Select a saved template...</option>';
        
        Object.keys(this.templates).forEach(key => {
            const template = this.templates[key];
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${template.jobTitle} (${this.getRoleDisplayName(template.role)})`;
            selector.appendChild(option);
        });
    }
    
    loadSavedDrafts() {
        const selector = document.getElementById('savedDrafts');
        selector.innerHTML = '<option value="">Select a saved draft...</option>';
        
        Object.keys(this.drafts).forEach(key => {
            const draft = this.drafts[key];
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${draft.name} (${draft.variationsCount || 0} variations)`;
            selector.appendChild(option);
        });
    }

    loadTemplate(templateKey) {
        if (templateKey && this.templates[templateKey]) {
            document.getElementById('emailTemplate').value = this.templates[templateKey].template;
            this.showLog('Template loaded', 'success');
        }
    }
    
    loadDraft(draftKey) {
        if (draftKey && this.drafts[draftKey]) {
            const draft = this.drafts[draftKey];
            document.getElementById('draftMessage').value = draft.message;
            this.aiVariations = draft.aiVariations || [];
            this.manualVariations = draft.manualVariations || [];
            this.combineVariations();
            this.updateVariationsStatus();
            this.showLog('Draft loaded with variations', 'success');
        }
    }
    
    combineVariations() {
        this.variations = [...this.aiVariations, ...this.manualVariations];
    }
    
    saveDraft() {
        const message = document.getElementById('draftMessage').value;
        
        if (!message) {
            this.showLog('Please enter a draft message first', 'warning');
            return;
        }

        const nameInput = document.getElementById('draftName');
        nameInput.style.display = 'inline-block';
        nameInput.focus();
        
        nameInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                const name = nameInput.value || 'Draft ' + Date.now();
                const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                
                this.drafts[key] = {
                    name: name,
                    message: message,
                    aiVariations: this.aiVariations,
                    manualVariations: this.manualVariations,
                    variations: this.variations,
                    variationsCount: this.variations.length,
                    createdAt: new Date().toISOString()
                };
                
                this.saveDraftsToStorage();
                this.loadSavedDrafts();
                this.showLog('Draft saved', 'success');
                
                nameInput.style.display = 'none';
                nameInput.value = '';
            }
        };
    }
    
    async craftVariations() {
        const message = document.getElementById('draftMessage').value;
        const jobTitle = document.getElementById('jobTitle').value;
        const companyName = document.getElementById('companyName').value;
        
        if (!message) {
            this.showLog('Please enter a draft message first', 'error');
            return;
        }
        
        if (!this.config.hasAIKey) {
            // Fallback to simple variations without AI
            this.aiVariations = this.generateSimpleVariations(message, 10);
            this.combineVariations();
            this.updateVariationsStatus();
            this.showLog(`${this.aiVariations.length} simple variations created (no AI configured)`, 'info');
            return;
        }
        
        this.showLoading('craftVariationsBtn', true);
        
        try {
            const response = await fetch('/api/craft-variations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    baseMessage: message,
                    jobTitle: jobTitle,
                    companyName: companyName,
                    count: 10
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            this.aiVariations = result.variations;
            this.combineVariations();
            this.updateVariationsStatus();
            this.showLog(`${this.aiVariations.length} AI variations crafted successfully using ${result.provider.toUpperCase()}`, 'success');
            
        } catch (error) {
            // Fallback to simple variations
            this.aiVariations = this.generateSimpleVariations(message, 10);
            this.combineVariations();
            this.updateVariationsStatus();
            this.showLog(`AI failed, created ${this.aiVariations.length} simple variations instead: ${error.message}`, 'warning');
        } finally {
            this.showLoading('craftVariationsBtn', false);
        }
    }
    
    generateSimpleVariations(baseMessage, count) {
        const variations = [baseMessage]; // Include original
        const synonyms = {
            'interested': ['keen on', 'excited about', 'passionate about', 'drawn to'],
            'opportunity': ['position', 'role', 'opening', 'job'],
            'experience': ['background', 'expertise', 'skills', 'knowledge'],
            'would love': ['would be thrilled', 'am eager', 'would welcome', 'am excited'],
            'discuss': ['chat about', 'talk about', 'explore', 'review'],
            'thank you': ['thanks', 'appreciate', 'grateful'],
            'help': ['assistance', 'guidance', 'support', 'advice'],
            'connect': ['reach out', 'get in touch', 'contact', 'communicate']
        };
        
        for (let i = 1; i < count; i++) {
            let variation = baseMessage;
            
            // Apply random synonym replacements
            Object.keys(synonyms).forEach(word => {
                if (variation.toLowerCase().includes(word) && Math.random() > 0.4) {
                    const replacements = synonyms[word];
                    const replacement = replacements[Math.floor(Math.random() * replacements.length)];
                    const regex = new RegExp(`\\b${word}\\b`, 'gi');
                    variation = variation.replace(regex, replacement);
                }
            });
            
            variations.push(variation);
        }
        
        return variations;
    }
    
    generateSubjectVariations(jobTitle, companyName, count) {
        const baseSubjects = [
            `Interest in ${jobTitle} role at ${companyName}`,
            `Application for ${jobTitle} position at ${companyName}`,
            `${jobTitle} opportunity at ${companyName}`,
            `Exploring ${jobTitle} role at ${companyName}`,
            `${jobTitle} position inquiry - ${companyName}`,
            `Passionate about ${jobTitle} role at ${companyName}`,
            `${jobTitle} opportunity - [First Name] [Last Name]`,
            `Re: ${jobTitle} position at ${companyName}`,
            `${companyName} ${jobTitle} role - Application`,
            `Interested in joining ${companyName} as ${jobTitle}`
        ];
        
        const subjects = [];
        
        // Generate the requested number of subject variations
        for (let i = 0; i < count; i++) {
            const baseSubject = baseSubjects[i % baseSubjects.length];
            
            // Add some variety
            let subject = baseSubject;
            if (Math.random() > 0.7) {
                const prefixes = ['Re: ', 'Regarding: ', ''];
                const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                subject = prefix + subject;
            }
            
            subjects.push(subject);
        }
        
        return subjects;
    }
    
    updateVariationsStatus() {
        const status = document.getElementById('variationsStatus');
        const count = document.getElementById('variationsCount');
        const aiCount = document.getElementById('aiCount');
        const manualCount = document.getElementById('manualCount');
        const manageBtn = document.getElementById('manageVariationsBtn');
        
        if (this.variations.length > 0) {
            count.textContent = this.variations.length;
            aiCount.textContent = this.aiVariations.length;
            manualCount.textContent = this.manualVariations.length;
            status.style.display = 'block';
            manageBtn.style.display = 'inline-block';
        } else {
            status.style.display = 'none';
            manageBtn.style.display = 'none';
        }
        
        this.refreshIcons();
    }
    
    addManualVariation() {
        const baseMessage = document.getElementById('draftMessage').value;
        if (!baseMessage) {
            this.showLog('Please enter a draft message first', 'warning');
            return;
        }
        
        this.openVariationModal();
        document.getElementById('variationText').value = baseMessage;
        document.getElementById('variationText').focus();
    }
    
    openVariationModal() {
        const modal = document.getElementById('variationModal');
        modal.style.display = 'flex';
        this.refreshVariationsList();
        this.refreshIcons();
    }
    
    closeVariationModal() {
        const modal = document.getElementById('variationModal');
        modal.style.display = 'none';
        this.cancelEdit();
    }
    
    refreshVariationsList() {
        const container = document.getElementById('variationsList');
        const modalCount = document.getElementById('modalVariationCount');
        
        container.innerHTML = '';
        modalCount.textContent = this.variations.length;
        
        // Add AI variations
        this.aiVariations.forEach((variation, index) => {
            const item = this.createVariationItem(variation, 'ai', index, 'ai');
            container.appendChild(item);
        });
        
        // Add manual variations
        this.manualVariations.forEach((variation, index) => {
            const item = this.createVariationItem(variation, 'manual', index, 'manual');
            container.appendChild(item);
        });
        
        this.refreshIcons();
    }
    
    createVariationItem(variation, type, index, arrayType) {
        const item = document.createElement('div');
        item.className = `variation-item ${type === 'ai' ? 'ai-generated' : 'manual'}`;
        item.innerHTML = `
            <div class="variation-header">
                <span class="variation-type ${type}">${type === 'ai' ? 'AI Generated' : 'Manual'}</span>
                <div class="variation-actions">
                    ${type === 'manual' ? `<button class="btn btn-outline edit-variation-btn" data-type="${arrayType}" data-index="${index}"><i data-feather="edit-2"></i> Edit</button>` : ''}
                    <button class="btn btn-danger delete-variation-btn" data-type="${arrayType}" data-index="${index}"><i data-feather="trash-2"></i> Delete</button>
                </div>
            </div>
            <div class="variation-text">${variation}</div>
            <textarea class="edit-textarea" rows="4">${variation}</textarea>
        `;
        
        // Add event listeners
        const editBtn = item.querySelector('.edit-variation-btn');
        const deleteBtn = item.querySelector('.delete-variation-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', () => this.editVariation(arrayType, index, item));
        }
        
        deleteBtn.addEventListener('click', () => this.deleteVariation(arrayType, index));
        
        return item;
    }
    
    saveCurrentVariation() {
        const text = document.getElementById('variationText').value.trim();
        const saveBtn = document.getElementById('saveVariationBtn');
        const cancelBtn = document.getElementById('cancelEditBtn');
        
        if (!text) {
            this.showLog('Please enter a variation', 'warning');
            return;
        }
        
        if (this.editingVariationIndex >= 0) {
            // Update existing variation
            this.manualVariations[this.editingVariationIndex] = text;
            this.showLog('Variation updated', 'success');
        } else {
            // Add new variation
            this.manualVariations.push(text);
            this.showLog('Manual variation added', 'success');
        }
        
        this.combineVariations();
        this.updateVariationsStatus();
        this.refreshVariationsList();
        
        // Reset form
        document.getElementById('variationText').value = '';
        this.editingVariationIndex = -1;
        saveBtn.innerHTML = `${this.icon('check')} Save`;
        cancelBtn.style.display = 'none';
        this.refreshIcons();
    }
    
    editVariation(arrayType, index, itemElement) {
        if (arrayType === 'manual') {
            const textarea = itemElement.querySelector('.edit-textarea');
            const variationText = document.getElementById('variationText');
            const saveBtn = document.getElementById('saveVariationBtn');
            const cancelBtn = document.getElementById('cancelEditBtn');
            
            // Populate edit form
            variationText.value = this.manualVariations[index];
            this.editingVariationIndex = index;
            
            // Update buttons
            saveBtn.innerHTML = `${this.icon('check')} Update`;
            cancelBtn.style.display = 'inline-block';
            
            // Focus on editor
            variationText.focus();
            variationText.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            this.refreshIcons();
        }
    }
    
    deleteVariation(arrayType, index) {
        if (!confirm('Are you sure you want to delete this variation?')) {
            return;
        }
        
        if (arrayType === 'ai') {
            this.aiVariations.splice(index, 1);
        } else {
            this.manualVariations.splice(index, 1);
        }
        
        this.combineVariations();
        this.updateVariationsStatus();
        this.refreshVariationsList();
        this.showLog('Variation deleted', 'info');
    }
    
    cancelEdit() {
        const saveBtn = document.getElementById('saveVariationBtn');
        const cancelBtn = document.getElementById('cancelEditBtn');
        
        document.getElementById('variationText').value = '';
        this.editingVariationIndex = -1;
        saveBtn.innerHTML = `${this.icon('check')} Save`;
        cancelBtn.style.display = 'none';
        this.refreshIcons();
    }
    
    saveDraftsToStorage() {
        localStorage.setItem('draftMessages', JSON.stringify(this.drafts));
    }

    saveTemplate() {
        const template = document.getElementById('emailTemplate').value;
        const jobTitle = document.getElementById('jobTitle').value;
        
        if (!template || !jobTitle) {
            this.showLog('Please enter job title and generate template first', 'warning');
            return;
        }

        const nameInput = document.getElementById('templateName');
        nameInput.style.display = 'inline-block';
        nameInput.focus();
        
        nameInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                const name = nameInput.value || jobTitle;
                const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                
                this.templates[key] = {
                    template: template,
                    jobTitle: name,
                    role: this.detectedRole,
                    keywords: this.extractKeywords(template),
                    createdAt: new Date().toISOString()
                };
                
                this.saveTemplatesToStorage();
                this.loadSavedTemplates();
                this.showLog('Template saved', 'success');
                
                nameInput.style.display = 'none';
                nameInput.value = '';
            }
        };
    }
    
    extractKeywords(text) {
        const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.includes(word))
            .slice(0, 10);
    }

    saveTemplatesToStorage() {
        localStorage.setItem('emailTemplates', JSON.stringify(this.templates));
    }

    handleCSVPaste() {
        const csvData = document.getElementById('csvData').value.trim();
        if (!csvData) {
            this.showLog('Please paste CSV data first', 'warning');
            return;
        }

        try {
            this.recipients = this.parseCSV(csvData);
            this.displayRecipients();
            this.showLog(`Loaded ${this.recipients.length} recipients`, 'success');
        } catch (error) {
            this.showLog(`Error parsing CSV: ${error.message}`, 'error');
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const requiredHeaders = ['email', 'first_name', 'last_name', 'position'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
        }

        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const recipient = {};
            headers.forEach((header, index) => {
                recipient[header] = values[index] || '';
            });
            return recipient;
        }).filter(r => r.email);
    }

    addManualEntry() {
        const email = document.getElementById('manualEmail').value.trim();
        const firstName = document.getElementById('manualFirstName').value.trim();
        const lastName = document.getElementById('manualLastName').value.trim();
        const position = document.getElementById('manualPosition').value.trim();

        if (!email) {
            this.showLog('Please enter an email address', 'error');
            return;
        }

        const missingFields = [];
        if (!firstName) missingFields.push('First Name');
        if (!lastName) missingFields.push('Last Name');
        if (!position) missingFields.push('Position');

        if (missingFields.length > 0) {
            this.showLog(`Please fill in: ${missingFields.join(', ')}`, 'error');
            return;
        }

        // Check if email already exists
        const existingRecipient = this.recipients.find(r => r.email.toLowerCase() === email.toLowerCase());
        if (existingRecipient) {
            this.showLog('Email address already exists in the list', 'warning');
            return;
        }

        // Add the new recipient
        const newRecipient = {
            email: email,
            first_name: firstName,
            last_name: lastName,
            position: position
        };

        this.recipients.push(newRecipient);
        this.displayRecipients();
        this.clearManualForm();
        this.showLog(`Added ${firstName} ${lastName} (${email})`, 'success');
    }

    clearManualForm() {
        console.log('Clearing manual form...'); // Debug log
        
        // Get all form elements and clear them
        const emailField = document.getElementById('manualEmail');
        const firstNameField = document.getElementById('manualFirstName');
        const lastNameField = document.getElementById('manualLastName');
        const positionField = document.getElementById('manualPosition');
        
        if (emailField) {
            emailField.value = '';
            emailField.focus();
            emailField.blur();
        }
        if (firstNameField) firstNameField.value = '';
        if (lastNameField) lastNameField.value = '';
        if (positionField) positionField.value = '';
        
        // Force DOM update
        setTimeout(() => {
            if (emailField) emailField.value = '';
            if (firstNameField) firstNameField.value = '';
            if (lastNameField) lastNameField.value = '';
            if (positionField) positionField.value = '';
        }, 10);
        
        this.showLog('Form cleared', 'info');
    }

    removeRecipient(email) {
        this.recipients = this.recipients.filter(r => r.email !== email);
        this.displayRecipients();
        this.showLog(`Removed ${email}`, 'info');
    }

    displayRecipients() {
        const container = document.getElementById('recipientsPreview');
        container.innerHTML = '';

        if (this.recipients.length === 0) {
            container.innerHTML = '<p>No recipients loaded</p>';
            return;
        }

        this.recipients.forEach(recipient => {
            const item = document.createElement('div');
            item.className = 'recipient-item';
            item.innerHTML = `
                <span><strong>${recipient.first_name} ${recipient.last_name}</strong></span>
                <span>${recipient.email}</span>
                <span>${recipient.position}</span>
                <span>✓ Ready</span>
                <button class="remove-btn" onclick="emailSystem.removeRecipient('${recipient.email}')" title="Remove recipient">
                    ${this.icon('trash-2')}
                </button>
            `;
            container.appendChild(item);
        });
    }


    personalizeEmail(template, recipient, jobTitle, companyName) {
        const yourName = 'Anu'; // Will be replaced on server-side with env variable
        return template
            .replace(/\[Your name\]/g, yourName)
            .replace(/\[First Name\]/g, recipient.first_name)
            .replace(/\[Last Name\]/g, recipient.last_name)
            .replace(/\[Job Title\]/g, jobTitle)
            .replace(/\[Company Name\]/g, companyName)
            .replace(/\[Position\]/g, recipient.position);
    }

    async startEmailReview() {
        const draftMessage = document.getElementById('draftMessage').value;
        const jobTitle = document.getElementById('jobTitle').value;
        const companyName = document.getElementById('companyName').value;

        if (!this.config.hasEmailConfig) {
            this.showLog('Please configure email credentials in .env file', 'error');
            return;
        }

        if (!draftMessage) {
            this.showLog('Please enter a draft message first', 'error');
            return;
        }

        if (this.recipients.length === 0) {
            this.showLog('Please add recipients (CSV upload or manual entry)', 'error');
            return;
        }

        if (this.recipients.length > this.config.maxRecipients) {
            this.showLog(`Too many recipients. Maximum ${this.config.maxRecipients} per batch.`, 'error');
            return;
        }

        this.showLog('Preparing personalized emails...', 'info');
        
        try {
            // Use draft message if no variations exist, or use variations if they do
            let messagesToUse = [];
            if (this.variations.length === 0) {
                // Use the base draft message
                messagesToUse = [draftMessage];
                this.showLog('Using base draft message (no variations crafted)', 'info');
            } else {
                messagesToUse = this.variations;
                this.showLog(`Using ${this.variations.length} variations for personalization`, 'info');
            }
            
            // Generate varied subjects
            const subjectVariations = this.generateSubjectVariations(jobTitle, companyName, messagesToUse.length);
            
            // Create personalized emails using random variations
            const personalizedRecipients = this.recipients.map((recipient, index) => {
                // Pick a random variation and corresponding subject
                const randomIndex = Math.floor(Math.random() * messagesToUse.length);
                const randomVariation = messagesToUse[randomIndex];
                const randomSubject = subjectVariations[randomIndex];
                
                return {
                    ...recipient,
                    personalizedEmail: this.personalizeEmail(randomVariation, recipient, jobTitle, companyName),
                    subject: this.personalizeEmail(randomSubject, recipient, jobTitle, companyName),
                    variationUsed: randomIndex,
                    messageVariation: randomVariation,
                    subjectVariation: randomSubject
                };
            });
            
            // Always show review interface first, regardless of sending mode
            const response = await fetch('/api/preview-emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipients: personalizedRecipients,
                    draftMessage: draftMessage,
                    variations: messagesToUse,
                    subjectVariations: subjectVariations,
                    jobTitle: jobTitle,
                    companyName: companyName,
                    resumeSelection: this.getSelectedResumeInfo()
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            this.startEmailReviewProcess(result.emailPreviews, result.resumeInfo);
            
        } catch (error) {
            this.showLog(`Error preparing emails: ${error.message}`, 'error');
            console.error('Email preview error:', error);
        }
    }

    async sendCurrentEmail() {
        const email = this.emailPreviews[this.currentEmailIndex];
        const sendBtn = document.getElementById('sendEmailBtn');
        
        // Show loading state
        const originalText = sendBtn.innerHTML;
        sendBtn.innerHTML = `${this.icon('send')} Sending...`;
        sendBtn.disabled = true;
        
        // Get the edited values from the form
        const editedSubject = document.getElementById('emailSubject').value;
        const editedBody = document.getElementById('emailBody').value;
        
        try {
            const response = await fetch('/api/send-single-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipient: email.recipient.email,
                    subject: editedSubject,
                    body: editedBody,
                    resumeSelection: this.getSelectedResumeInfo()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.sentEmails.push(email);
                this.showLog(`${this.icon('check')} Email sent to ${email.recipient.email}`, 'success');
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            this.showLog(`${this.icon('x')} Failed to send email to ${email.recipient.email}: ${error.message}`, 'error');
        } finally {
            // Restore button state
            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
        }
        
        this.currentEmailIndex++;
        this.displayCurrentEmail();
    }

    skipCurrentEmail() {
        const email = this.emailPreviews[this.currentEmailIndex];
        this.skippedEmails.push(email);
        
        this.showLog(`${this.icon('skip-forward')} Skipped email to ${email.recipient.email}`, 'warning');
        
        this.currentEmailIndex++;
        this.displayCurrentEmail();
    }

    startEmailReviewProcess(emailPreviews, resumeInfo) {
        this.emailPreviews = emailPreviews;
        this.currentEmailIndex = 0;
        this.sentEmails = [];
        this.skippedEmails = [];
        this.resumeInfo = resumeInfo;
        
        this.showLog(`Starting email review process. ${emailPreviews.length} emails to review.`, 'success');
        
        // Show the email review interface
        this.showEmailReviewInterface();
        
        // Display the first email
        this.displayCurrentEmail();
    }

    showEmailReviewInterface() {
        // Hide the main interface and show email review
        document.getElementById('mainContent').style.display = 'none';
        
        // Create email review interface if it doesn't exist
        let reviewInterface = document.getElementById('emailReviewInterface');
        if (!reviewInterface) {
            reviewInterface = document.createElement('div');
            reviewInterface.id = 'emailReviewInterface';
            reviewInterface.innerHTML = `
                <div class="email-review-container">
                    <div class="review-header">
                        <h2>${this.icon('mail')} Email Review & Send</h2>
                        <div class="progress-info">
                            <span id="emailProgress">Email 1 of X</span>
                            <span id="emailStats">Sent: 0 | Skipped: 0</span>
                        </div>
                    </div>
                    
                    <div class="email-preview-card">
                        <div class="recipient-info">
                            <h3 id="recipientName">Loading...</h3>
                            <p id="recipientDetails">Loading...</p>
                            <div id="variationInfo" class="variation-info">
                                <span class="variation-badge">Variation 1</span>
                                <span class="message-type">Base Message</span>
                            </div>
                        </div>
                        
                        <div class="email-content">
                            <div class="email-subject">
                                <strong>Subject:</strong> 
                                <input type="text" id="emailSubject" class="editable-subject" placeholder="Loading...">
                            </div>
                            
                            <div class="email-body-container">
                                <strong>Body:</strong>
                                <textarea id="emailBody" class="editable-body" placeholder="Loading..."></textarea>
                            </div>
                            
                            <div class="email-attachments" id="emailAttachments">
                                <!-- Resume attachment info will be shown here -->
                            </div>
                        </div>
                    </div>
                    
                    <div class="review-actions">
                        <button id="skipEmailBtn" class="btn btn-secondary">${this.icon('skip-forward')} Skip This Email</button>
                        <button id="sendEmailBtn" class="btn btn-primary">${this.icon('send')} Send Email</button>
                    </div>
                    
                    <div class="review-controls">
                        <button id="stopReviewBtn" class="btn btn-danger">${this.icon('stop-circle')} Stop Review</button>
                        <button id="sendAllBtn" class="btn btn-success">${this.icon('clock')} Send All (Scheduled over 12 hours)</button>
                    </div>
                </div>
            `;
            document.body.appendChild(reviewInterface);
            
            // Refresh Feather icons for new elements
            this.refreshIcons();
            
            // Add event listeners for review buttons
            document.getElementById('sendEmailBtn').addEventListener('click', () => this.sendCurrentEmail());
            document.getElementById('skipEmailBtn').addEventListener('click', () => this.skipCurrentEmail());
            document.getElementById('stopReviewBtn').addEventListener('click', () => this.stopEmailReview());
            document.getElementById('sendAllBtn').addEventListener('click', () => this.sendAllScheduled());
        }
        
        reviewInterface.style.display = 'block';
    }

    displayCurrentEmail() {
        if (this.currentEmailIndex >= this.emailPreviews.length) {
            this.completeEmailReview();
            return;
        }
        
        const email = this.emailPreviews[this.currentEmailIndex];
        
        // Update progress
        document.getElementById('emailProgress').textContent = 
            `Email ${this.currentEmailIndex + 1} of ${this.emailPreviews.length}`;
        document.getElementById('emailStats').textContent = 
            `Sent: ${this.sentEmails.length} | Skipped: ${this.skippedEmails.length}`;
        
        // Update recipient info
        document.getElementById('recipientName').textContent = 
            `${email.recipient.firstName} ${email.recipient.lastName}`;
        document.getElementById('recipientDetails').textContent = 
            `${email.recipient.position} • ${email.recipient.email}`;
            
        // Update variation info
        const variationInfo = document.getElementById('variationInfo');
        const variationBadge = variationInfo.querySelector('.variation-badge');
        const messageType = variationInfo.querySelector('.message-type');
        
        if (email.variationUsed !== undefined) {
            variationBadge.textContent = `Variation ${email.variationUsed + 1}`;
            
            // Determine message type
            if (this.variations.length === 0) {
                messageType.textContent = 'Base Message';
                messageType.className = 'message-type';
            } else if (email.variationUsed < this.aiVariations.length) {
                messageType.textContent = 'AI Generated';
                messageType.className = 'message-type ai';
            } else {
                messageType.textContent = 'Manual';
                messageType.className = 'message-type manual';
            }
        } else {
            variationBadge.textContent = 'Email 1';
            messageType.textContent = 'Base Message';
            messageType.className = 'message-type';
        }
        
        // Update email content (editable fields)
        document.getElementById('emailSubject').value = email.subject;
        document.getElementById('emailBody').value = email.body;
        
        // Update attachment info with resume selection details
        const resumeInfo = this.getSelectedResumeInfo();
        let attachmentInfo = '';
        
        if (resumeInfo.type === 'none') {
            attachmentInfo = `<div class="attachment-info">${this.icon('info')} <strong>No resume attachment</strong> (as selected)</div>`;
        } else if (this.resumeInfo && this.resumeInfo.exists) {
            const resumeTypeText = {
                'auto': 'Auto-selected',
                'software': 'Software Engineering',
                'datascience': 'Data Science',
                'custom': 'Custom'
            }[resumeInfo.type] || 'Default';
            
            attachmentInfo = `<div class="attachment-info">${this.icon('paperclip')} <strong>Resume attached:</strong> ${this.resumeInfo.fileName} (${resumeTypeText})</div>`;
        } else {
            attachmentInfo = `<div class="attachment-warning">${this.icon('alert-triangle')} <strong>Resume not found!</strong> Check your resume selection</div>`;
        }
        
        attachmentInfo += `<div class="portfolio-info">${this.icon('globe')} <strong>Portfolio:</strong> ${email.portfolio || 'https://anudeepnayak.dev/'}</div>`;
        
        document.getElementById('emailAttachments').innerHTML = attachmentInfo;
        
        // Refresh Feather icons for attachment info
        this.refreshIcons();
    }

    async sendAllScheduled() {
        const remaining = this.emailPreviews.length - this.currentEmailIndex;
        
        if (!confirm(`Schedule all remaining ${remaining} emails to be sent over 12 hours with random timing?`)) {
            return;
        }
        
        document.getElementById('sendAllBtn').innerHTML = `${this.icon('clock')} Scheduling...`;
        
        // Get remaining emails and schedule them
        const remainingEmails = this.emailPreviews.slice(this.currentEmailIndex);
        
        remainingEmails.forEach((email, index) => {
            const actualIndex = this.currentEmailIndex + index;
            const scheduledTime = this.calculateScheduledTime(actualIndex, remainingEmails.length);
            const delay = scheduledTime.getTime() - Date.now();
            
            if (delay > 0) {
                setTimeout(async () => {
                    try {
                        const response = await fetch('/api/send-single-email', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                recipient: email.recipient.email,
                                subject: email.subject,
                                body: email.body,
                                resumeSelection: this.getSelectedResumeInfo()
                            })
                        });
                        
                        if (response.ok) {
                            this.showLog(`📧 Scheduled email sent to ${email.recipient.email}`, 'success');
                        }
                    } catch (error) {
                        this.showLog(`❌ Failed to send scheduled email to ${email.recipient.email}`, 'error');
                    }
                }, delay);
                
                const timeStr = scheduledTime.toLocaleString();
                this.showLog(`⏰ Email to ${email.recipient.email} scheduled for ${timeStr}`, 'info');
            }
        });
        
        // Mark all as sent and complete review
        this.sentEmails = [...this.sentEmails, ...remainingEmails];
        this.currentEmailIndex = this.emailPreviews.length;
        this.showLog(`🚀 ${remaining} emails scheduled over 12 hours!`, 'success');
        this.completeEmailReview();
    }

    stopEmailReview() {
        if (confirm('Stop email review process? You can resume later.')) {
            this.completeEmailReview();
        }
    }

    completeEmailReview() {
        document.getElementById('emailReviewInterface').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
        const totalEmails = this.emailPreviews.length;
        const sent = this.sentEmails.length;
        const skipped = this.skippedEmails.length;
        const remaining = totalEmails - sent - skipped;
        
        this.showLog(`${this.icon('bar-chart')} Email Review Complete! Sent: ${sent}, Skipped: ${skipped}, Remaining: ${remaining}`, 'success');
        
        if (sent > 0) {
            this.showLog(`${this.icon('check-circle')} Successfully sent ${sent} personalized emails with resume attachments!`, 'success');
        }
    }

    async saveDraftToProtonMail(email, password, recipientEmail, subject, body) {
        try {
            const response = await fetch('/api/create-drafts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    protonEmail: email,
                    protonPassword: password,
                    recipients: [{ email: recipientEmail }],
                    emailTemplate: body,
                    subject: subject
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            this.showLog(`Draft saved for ${recipientEmail}`, 'success');
            return result;
        } catch (error) {
            this.showLog(`Failed to save draft for ${recipientEmail}: ${error.message}`, 'error');
            throw error;
        }
    }

    showProgress(show) {
        const progressContainer = document.getElementById('progress');
        progressContainer.style.display = show ? 'block' : 'none';
        
        if (!show) {
            this.updateProgress(0, 'Ready');
        }
    }

    updateProgress(percentage, text) {
        document.getElementById('progressFill').style.width = percentage + '%';
        document.getElementById('progressText').textContent = text;
    }

    showLoading(buttonId, show) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        if (show) {
            button.dataset.originalText = button.innerHTML;
            if (buttonId === 'craftVariationsBtn') {
                button.innerHTML = '<span class="spinner"></span>Crafting...';
            } else {
                button.innerHTML = '<span class="spinner"></span>Generating...';
            }
            button.disabled = true;
        } else {
            button.innerHTML = button.dataset.originalText || `${this.icon('zap')} Generate New Template`;
            button.disabled = false;
            this.refreshIcons();
        }
    }

    showLog(message, type = 'info') {
        const logsContainer = document.getElementById('logs');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `[${timestamp}] ${message}`;
        
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
        
        // Keep only last 100 log entries
        const entries = logsContainer.getElementsByClassName('log-entry');
        if (entries.length > 100) {
            logsContainer.removeChild(entries[0]);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    calculateScheduledTime(index, totalEmails) {
        // Spread emails over 12 hours with ±10 minute variability
        const twelveHoursMs = 12 * 60 * 60 * 1000;
        const baseInterval = twelveHoursMs / totalEmails;
        const scheduledTime = baseInterval * index;
        
        // Add random variability of ±10 minutes
        const variability = 10 * 60 * 1000; // 10 minutes in ms
        const randomOffset = (Math.random() - 0.5) * 2 * variability;
        
        return new Date(Date.now() + scheduledTime + randomOffset);
    }
    
    async scheduleEmails(personalizedRecipients, jobTitle, companyName) {
        this.showLog(`Scheduling ${personalizedRecipients.length} emails over 12 hours...`, 'info');
        
        for (let i = 0; i < personalizedRecipients.length; i++) {
            const recipient = personalizedRecipients[i];
            const delay = recipient.scheduledTime.getTime() - Date.now();
            
            if (delay > 0) {
                setTimeout(async () => {
                    try {
                        await this.sendScheduledEmail(recipient);
                        this.showLog(`📧 Scheduled email sent to ${recipient.email}`, 'success');
                    } catch (error) {
                        this.showLog(`❌ Failed to send scheduled email to ${recipient.email}: ${error.message}`, 'error');
                    }
                }, delay);
                
                const timeStr = recipient.scheduledTime.toLocaleString();
                this.showLog(`⏰ Email to ${recipient.email} scheduled for ${timeStr}`, 'info');
            } else {
                // If the calculated time is in the past, send immediately
                try {
                    await this.sendScheduledEmail(recipient);
                    this.showLog(`📧 Email sent immediately to ${recipient.email}`, 'success');
                } catch (error) {
                    this.showLog(`❌ Failed to send email to ${recipient.email}: ${error.message}`, 'error');
                }
            }
        }
        
        this.showLog(`🚀 All emails scheduled! They will be sent automatically over the next 12 hours.`, 'success');
    }
    
    async sendScheduledEmail(recipient) {
        const response = await fetch('/api/send-single-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipient: recipient.email,
                subject: recipient.subject,
                body: recipient.personalizedEmail,
                resumeSelection: this.getSelectedResumeInfo()
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to send email');
        }
        
        return await response.json();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EmailAutomationSystem();
});
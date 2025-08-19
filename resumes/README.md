# Resume Storage Instructions

## 📁 Resume File Structure

Store your resumes in the `/resumes` directory with these exact names:

```
resumes/
├── anudeep_swp.pdf
├── anudeep_dsp.pdf
└── README.md (this file)
```

## 📝 File Naming Convention

**Important**: Use these exact filenames so the system can automatically detect them:

- **Software Engineering Resume**: `anudeep_swp.pdf`
- **Data Science Resume**: `anudeep_dsp.pdf`

## 📋 Resume Guidelines

### Software Engineering Resume Should Include:
- Programming languages (JavaScript, Python, Java, etc.)
- Frameworks (React, Node.js, Django, etc.)
- Technologies (AWS, Docker, Git, etc.)
- Projects with GitHub links
- Technical skills section
- Relevant experience

### Data Science Resume Should Include:
- Programming languages (Python, R, SQL, etc.)
- ML/AI frameworks (TensorFlow, PyTorch, Scikit-learn, etc.)
- Data tools (Pandas, NumPy, Jupyter, etc.)
- Statistical methods and techniques
- Data visualization tools (Matplotlib, Tableau, etc.)
- Relevant projects and datasets
- Academic background if relevant

## 🤖 How the System Uses Your Resumes

1. **Smart Selection**: The system will automatically choose the right resume based on detected job type
2. **Claude Integration**: Your resume content helps Claude generate more relevant emails
3. **Skill Matching**: The AI matches your resume skills to job requirements
4. **Context-Aware**: Emails reference specific skills from your chosen resume

## 📤 Upload Process

1. Save your PDFs with the exact names above
2. The web interface will automatically detect them
3. Select the resume type in the dropdown
4. The system will use the corresponding file

## ✅ Quick Setup

```bash
# Copy your resumes to the correct location:
cp /path/to/your/software_resume.pdf resumes/anudeep_swp.pdf
cp /path/to/your/datascience_resume.pdf resumes/anudeep_dsp.pdf
```

## 🔄 Updating Resumes

Simply replace the files with the same names. The system will automatically use the updated versions.
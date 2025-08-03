import os
import re
from pathlib import Path
from flask import Flask, render_template, request, send_file, flash, redirect, url_for
from werkzeug.utils import secure_filename
import tempfile
import logging

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key_for_dev")

# Configure upload settings
UPLOAD_FOLDER = tempfile.mkdtemp()
ALLOWED_EXTENSIONS = {'ass'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

def allowed_file(filename):
    """Check if file has allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def fix_punctuation_reverse(text):
    """Fix reversed punctuation marks by moving them from beginning to end"""
    # نقل علامات الترقيم مثل !! أو ؟؟ أو ... من البداية للنهاية
    text = re.sub(r'^([!?.،…]+)(\S.*)', r'\2\1', text)
    return text

def process_ass_file(input_path):
    """Process ASS file and return fixed content and changes list"""
    try:
        with open(input_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except UnicodeDecodeError:
        # Try with different encoding if UTF-8 fails
        with open(input_path, "r", encoding="utf-8-sig") as f:
            lines = f.readlines()
    
    fixed_lines = []
    changes = []
    
    for line_num, line in enumerate(lines, 1):
        if line.startswith("Dialogue:"):
            parts = line.split(",", 9)
            if len(parts) == 10:
                original_text = parts[9].strip()
                fixed_text = fix_punctuation_reverse(original_text)
                
                if original_text != fixed_text:
                    changes.append({
                        'line_number': line_num,
                        'original': original_text,
                        'fixed': fixed_text
                    })
                
                parts[9] = fixed_text + '\n' if line.endswith('\n') else fixed_text
                fixed_line = ",".join(parts)
                fixed_lines.append(fixed_line)
            else:
                fixed_lines.append(line)
        else:
            fixed_lines.append(line)
    
    return fixed_lines, changes

@app.route('/')
def index():
    """Main page for file upload"""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and processing"""
    if 'file' not in request.files:
        flash('لم يتم اختيار ملف', 'error')
        return redirect(url_for('index'))
    
    file = request.files['file']
    
    if file.filename == '':
        flash('لم يتم اختيار ملف', 'error')
        return redirect(url_for('index'))
    
    if not allowed_file(file.filename):
        flash('يجب أن يكون الملف من

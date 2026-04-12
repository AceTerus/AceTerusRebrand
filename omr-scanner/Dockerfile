FROM python:3.12-slim

# System deps: OpenCV, Tesseract, Poppler, git (for OMRChecker clone)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    tesseract-ocr \
    poppler-utils \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install our requirements first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Clone OMRChecker from GitHub and install its deps + extras
RUN git clone --depth=1 https://github.com/Udayraj123/OMRChecker.git OMRChecker
RUN pip install --no-cache-dir -r OMRChecker/requirements.txt
RUN pip install --no-cache-dir pymupdf dotmap

# Copy application code (OMRChecker already in place above)
COPY . .

RUN mkdir -p uploads static

EXPOSE 8080

CMD ["uvicorn", "main:socket_app", "--host", "0.0.0.0", "--port", "8080"]

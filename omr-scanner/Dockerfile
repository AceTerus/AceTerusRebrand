FROM python:3.12-slim

# System deps: OpenCV, Tesseract, Poppler (pdf2image)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p uploads static

EXPOSE 8080

CMD ["uvicorn", "main:socket_app", "--host", "0.0.0.0", "--port", "8080"]

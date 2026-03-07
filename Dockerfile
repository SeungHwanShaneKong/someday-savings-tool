# [ZERO-COST-PIPELINE-2026-03-07] 웨딩 데이터 크롤러 Docker 이미지
# 로컬 실행 및 포터블 배포용
#
# 빌드:  docker build -t wedding-crawler .
# 실행:  docker run --env-file .env.crawler wedding-crawler
#
# 필수 환경변수:
#   EDGE_FUNCTION_URL    - Supabase Edge Function URL
#   EDGE_FUNCTION_KEY    - Supabase anon/service key
#   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
#   CRON_SECRET          - Edge Function cron secret

FROM python:3.11-slim

LABEL maintainer="WeddingSem <noreply@weddingsem.com>"
LABEL description="Wedding data crawler for document and web source processing"

# System dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl \
      ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY .github/scripts/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Crawler script
COPY .github/scripts/crawl_documents.py ./crawl_documents.py

# Health check
HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
  CMD python -c "import PyPDF2; import pptx; print('OK')" || exit 1

# Default command: run crawler
CMD ["python", "crawl_documents.py"]

FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=portfolio.settings
ENV PYTHONPATH=/app/django-rest-framework

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt

COPY django-rest-framework ./django-rest-framework

RUN python django-rest-framework/manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "portfolio.wsgi:application", "--bind", "0.0.0.0:8000"]

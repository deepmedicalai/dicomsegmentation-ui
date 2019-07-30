FROM python:3.7

WORKDIR /app
ENV FLASK_APP app.py
ENV FLASK_RUN_HOST 0.0.0.0
EXPOSE 5000

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY ./dicom-segmentation /app
# COPY ./data /data
# COPY . .

RUN python3 -m venv env
# RUN python3 -c 'from dicom import create_thumbnail; create_thumbnail()'

CMD [ "flask", "run" ]
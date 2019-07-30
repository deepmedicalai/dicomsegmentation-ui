from flask import Flask, Response, request, flash, jsonify, send_from_directory, send_file
from requests_toolbelt import MultipartEncoder
import os 
import pydicom
from pydicom.data import get_testdata_files
from utils import create_dir, save_mask, apply_mask
import json
import base64

app = Flask(__name__)
app.secret_key = "super_secret_key"
app.run(debug=True)

# PATH = 'C:\\Projects\\dicom\\dicomsegmentation\\data'
PATH = '/data'
MASK = os.path.join(PATH, 'mask')
THUMBNAILS = os.path.join(PATH, 'thumbnails')
METADATA = os.path.join(PATH, 'metadata')

@app.route('/health/', methods=['GET'])
def home():
    return '<p>API works</p>'

@app.route('/study/', methods=['GET'])
def list_study():
    dicoms_list = [filename for filename in os.listdir(PATH) if filename != 'mask' and filename != 'metadata' and filename != 'thumbnails']
    masks_list = [os.path.splitext(filename)[0] for filename in os.listdir(MASK)]
    json_data = []
    for dicom in dicoms_list:
        dicom_id = os.path.splitext(dicom)[0]
        data = {}
        if dicom_id in masks_list:
            data['has_mask'] = "true"
        else:
            data['has_mask'] = "false"
        data['_id'] = dicom_id
        data['filename'] = dicom
        json_data.append(data)
    
    return jsonify({"data": json_data})


@app.route('/study/<string:study_id>/', methods=['GET'])
def load_study(study_id):
    return send_from_directory(directory=PATH, filename=study_id, as_attachment=True)

@app.route('/study/<study_id>/metadata', methods=['GET'])
def load_metadata(study_id):
    study_metadata = '{}.json'.format(study_id)
    return send_from_directory(directory=METADATA, filename=study_metadata, as_attachment=True)

@app.route('/study/<study_id>/mask', methods=['POST'])
def uploud_mask(study_id):
    if 'file' not in request.files:
        flash('No file part')
        return jsonify({'data': 'No file part'}), 400

    save_mask(request)

    print("Image saved")

    return jsonify(success=True)

@app.route('/study/<study_id>/metadata', methods=['POST'])
def uploud_metadata(study_id):
    data = request.get_json()
    f = open('{0}/{1}.json'.format(METADATA, study_id), 'w')
    dataStr = json.dumps(data)
    f.write(dataStr)
    return jsonify(success=True)

@app.route('/study/<study_id>/apply_mask', methods=['POST'])
def aply_mask(study_id):
    if 'file' not in request.files:
        save_mask(request)

    apply_mask(study_id)

    return jsonify(success=True)
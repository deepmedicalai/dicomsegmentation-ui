import os
import errno
import cv2
import pydicom
import PIL

PATH = '/data'
SEGMENTED = os.path.join(PATH, 'segmented')
MASK = os.path.join(PATH, 'mask')

def create_dir(path):
    """ Creates a directory or directories if they do not exist (mkdir -p)
    """
    try:
        os.makedirs(path)
    except OSError as exc:
        if exc.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise

def save_mask(request):
    """ Saves a mask or rewrites it
    """
    create_dir(MASK)
    posted_file = request.files["file"]
    file_name = request.form["name"]
    posted_file.save(os.path.join(MASK, file_name))

def apply_mask(study_id):
    ds = pydicom.dcmread(os.path.join(PATH, '{}.dcm'.format(study_id)))

    frames_num = is_multi_frame(ds)

    if frames_num == 0:
        print(ds.pixel_array.shape[:3])
        img = apply_mask_to_img(study_id, ds.pixel_array)
        cv2.imwrite(os.path.join(PATH, '{}_segmented.jpg'.format(study_id)), img)
    else:
        index = 0
        for frame in ds.pixel_array:
            img = apply_mask_to_img(study_id, frame)
            cv2.imwrite(os.path.join(SEGMENTED, '{0}_segmented_{1}.jpg'.format(study_id, index)), img)
            index += 1

def is_multi_frame(ds):
    try:
        return ds[0x28,0x08].value
    except:
        return 0

def apply_mask_to_img(study_id, frame):
    mask = cv2.imread(os.path.join(MASK, '{}.png'.format(study_id)))
    out_img = cv2.bitwise_and(frame, mask)
    return out_img

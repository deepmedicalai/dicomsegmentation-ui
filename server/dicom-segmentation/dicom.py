import errno
import os
import pydicom
import numpy as np
from PIL import Image
import cv2

upload_dir = '/data'
images_dir = os.path.join(upload_dir, 'images')
thumbnails_dir = os.path.join(upload_dir, 'thumbnails')

thumbnail_size = 256, 256

def mkdir_p(path):
    """ Creates a directory or directories if they do not exist (mkdir -p)
    """
    try:
        os.makedirs(path)
    except OSError as exc:
        if exc.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise

def normalize_and_scale(image):
    """ Normalizes and scales the pixel values to fit within standard
        0-255 value range
    Args:
        image (numpy.array): Input image.
    Returns:
        2D image scaled to uint8 (numpy.array)
    """
    minimum = image.min()
    maximum = image.max()

    intensity_range = float(maximum - minimum)
    # account for special case of zero
    # difference in max and min intensities
    if intensity_range == 0:
        return np.zeros_like(image)

    # normalize image values to 0. - 1. scale
    norm_image = (image - minimum) / intensity_range

    # return image scaled to 0 - 255
    return (255. * norm_image).astype(np.uint8)

def read_dicom_file(dicom_file):
    """ Reads a dicom file
    Args:
        dicom_file (FileStorage (application/dicom))
    Returns:
        PyDicom dataset (pydicom.dataset.FileDataset)
    """
    return pydicom.read_file(dicom_file)

def crop_square_image(pixel_data, has_frame):
    """ Crops a image to a square the size of the smallest of the image
        height or width
    Args:
        pixel_data: numpy.array
    Returns:
        cropped pixel data (numpy.array)
    """
    if has_frame > 0:
        frames, height, width = pixel_data.shape[:3]
    else:
        height, width = pixel_data.shape[:2]

    smallest_dimension = min(height, width)
    start_y = int(height / 2 - smallest_dimension / 2)
    end_y = start_y + smallest_dimension
    start_x = int(width / 2 - smallest_dimension / 2)
    end_x = start_x + smallest_dimension

    if has_frame > 0:
        return pixel_data[1, start_y:end_y, start_x:end_x]
    else:
        return pixel_data[start_y:end_y, start_x:end_x]

def create_thumbnail():
    """ Extracts pixel data from dicom file and writes an image and
        thumbnail to disk
    Args:
        dataset (pydicom.dataset.FileDataset)
        filename (string)
    Returns:
        image name (string)
    """
    dicoms_list = [os.path.splitext(filename)[0] for filename in os.listdir(upload_dir) if filename.find(".dcm") > 0]
    mkdir_p(thumbnails_dir)

    thumbnails_list = [os.path.splitext(filename)[0] for filename in os.listdir(thumbnails_dir)]

    for dicom_file_name in dicoms_list:
        if dicom_file_name not in thumbnails_list:
            dicom_file = '{0}/{1}.dcm'.format(upload_dir, dicom_file_name)
            dataset = pydicom.dcmread(dicom_file)

            is_pixel_array = has_pixel_array(dataset)

            if is_pixel_array is not None:
                pixel_data = normalize_and_scale(dataset.pixel_array)

                image_name = '{}.jpg'.format(dicom_file_name)

                # crop and save thumbnail image
                thumbnail_path = os.path.join(thumbnails_dir, image_name)
                has_frame = is_multi_frame(dataset)
                cropped_data = crop_square_image(pixel_data, has_frame)
                thumbnail_image = Image.fromarray(cropped_data)
                thumbnail_image_rgb = thumbnail_image.convert('RGB')
                thumbnail_image_rgb.thumbnail(thumbnail_size, Image.ANTIALIAS)
                thumbnail_image_rgb.save(thumbnail_path, 'JPEG')


def is_multi_frame(ds):
   try:
       return ds[0x28,0x08].value
   except:
       return 0

def has_pixel_array(ds):
   try:
       return ds.pixel_array
   except:
       return None
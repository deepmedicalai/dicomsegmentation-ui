------- FOR SERVER: -------

1. Create in folder "server" folder named "data" with all of your dicoms files 
2. Run next command 

$ cd server
$ docker-compose build
$ docker-compose up
$ cd dicom-segmentation
$ pip3 install requirements.txt
$ python3 -c 'from dicom import create_thumbnail; create_thumbnail()'  - (this command create thumbnails in folder server/data/thumbnails) - waste some time

3.  Copy folder "thumbnails" with created thumbnails and manually add it to client/src/      assets folder

------- FOR CLIENT: --------

1. npm i
2. ng serve

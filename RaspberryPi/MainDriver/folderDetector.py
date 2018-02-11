import os

def get_folder_size(folder):
    folder_size = 0
    for (path, dirs, files) in os.walk(folder):
      for file in files:
        filename = os.path.join(path, file)
        folder_size += os.path.getsize(filename)

    folder_size = folder_size/(1024*1024)
    return folder_size

def delete_oldest_file(folder):
    for topdirs, dirs, files in os.walk(folder):
        firstfile = sorted(files)[0]
        os.remove('/home/pi/Downloads/minicloud_images'+'/'+firstfile)
        print("Removed the first file", firstfile)
        break
    return 

def cleanup():
    size = get_folder_size('/home/pi/Downloads/minicloud_images')
    print("Folder = %0.1f MB" % size)
    if size > 100:
        delete_oldest_file('/home/pi/Downloads/minicloud_images')
        size = get_folder_size('/home/pi/Downloads/minicloud_images')
    
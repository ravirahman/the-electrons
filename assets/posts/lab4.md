Lab 4
=====

## Table of Contents

1. General Overview and Approach  
2. ROS Architecture Overview  
3. Visualize the Cone (Image Mask)  
4. Detect the Cone (Rectangle Finder)
       - Overview and Motivation
       - SIFT/RANSAC
       - Template Matching
       - Color Segmentation
       - Actual Implementation
5. Locate the Cone (Coordinate Transform)
       - Overview and Motivation
       - Approach
6. Robot Parking
       - Overview and Motivation
       - Approach
7. Line Following (Pure Pursuit)
       - Overview and Motivation
       - Approach
8. Team Workflow Updates  
9. Lessons Learned

## General Overview and Approach - Kolby

This lab came right on the heels of the wall following and safety controller lab. The complexity was increased a bit for this assignment, which focused on visual servoing. From object detection algorithms all the way to line following, the lab this week taught us how to make the robot detect an object or point of interest and continually follow it. The lab consisted of 4 sections, so we decided to tackle each one in subteams of one or two people. We noticed early on that robot parking and line following would have very similar structure, both using a lot of the code developed in the first two sections (cone detection and cone localization). Therefore we were able to parallelize the work and simply perform an integration of the parts at the end. Over the course of the week we expanded our knowledge of ROS structure, especially the communication between nodes, as well as the power of modularity. Some challenges did arise, but they were all learning experiences.

## ROS Architecture Overview - Sabina and Ravi

<span class="image main">![](assets/images/lab4/ROS_Architecture.png)</span>
<center>**Figure 4.1: General ROS architecture flow**</center>

The above figure illustrates our ROS pipeline that links together the various components to enable parking and line following. First, the Image Masking node subscribes to the Zed Camera and publishes a masked image. The Rectangle Finder node subscribes to the masked image topic and publishes a bounding box and target point within the image. The Coordinate Transform node subscribes to the bounding box topic and converts the target point from image pixels to real-world coordinates. The Robot Parking and Pure Pursuit nodes subscribe to a topic where real-world target coordinates are published, and in turn directly publishes the driving commands. We use a launch file to launch all the necessary nodes at once when running robot parking and line following.

<span class="image main">![](assets/images/lab4/ROS_Flow_Example.png)</span>
<center>**Figure 4.2: Specific ROS Architecture flow example**</center>

Our biggest challenge was integrating these coordinates together. We tested all packages individually using mock data. However, when combing these packages into one pipeline, we realized our specifications were not consistent, and that mock data didn’t represent real-world conditions. We had to adjust ROS topic names and data types so they were consistent. We also needed to adjust parameter values, such as the coordinates in the transformation matrix or orange color of the cone, to reflect robot and testing conditions. Finally, we confirmed that our code worked as expected.

## Visualize the Cone (Image Mask) - Sabina and Ravi

The robot visualizes the cone through use of the ZED camera and OpenCV transformations. We discovered, with the assistance of another lab group, that the ZED Camera must be directly plugged into USB on the Jetson, as the USB extender did not offer sufficient power or bandwidth.

Our image mask node listens to `/zed/rgb/image_rect_color` topic and performs transforms to the image so it can be used by the cone detection algorithms (described in the next section). First, we use OpenCV to convert images from a raw byte array to a multidimensional numpy array. Then, because the camera is mounted upside down, we use OpenCV to rotate the image 180 degree. Finally, we mask the picture to the region corresponding to what appears on the floor 1-2 meters in front of the robot. This cropping simplifies detection of the cone, so irrelevant features in the background will not interfere with color matching. Finally, we broadcast this new image topic `masked_image_topic` as a numpy message of an Image, which is then processed by the cone detection algorithms.

<center><span>![Raw Camera Image](assets/images/lab4/Raw_Camera_Image.png =475x500)</span></center>

<center>**Figure 4.3: Raw Camera Image**</center>

<center><span>![Masked Image](assets/images/lab4/Masked_Image.png =475x500)</span></center>

<center>**Figure 4.4: Masked Image**</center>


## Detect the Cone (Rectangle Finder) - Sabina and Marek

### Overview and Motivation

The goal of this part of the lab was to use various object detection algorithms to detect a cone in test images and to compare the effectiveness of these algorithms. The work performed in this section played into a larger scope of this lab first by learning how to detect certain objects in an image and further by selecting an accurate method of object detection moving forward. The ability to detect objects, whether they be obstacles or paths to follow, is essential to autonomous driving.

### SIFT/RANSAC

We first attempted to use SIFT to detect the cone. The algorithm takes in the training image of the cone, and comparing it to a image template, uses OpenCV SIFT to detect features and descriptors for each image. It then uses a brute-force matcher to match features between the image template and training image to identify similar feature points, and applies a ratio test using a distance metric to filter out bad feature matches. If there are more than 10 good feature matches, then, using only the good feature matches, we find the pixel location of the good points on the training image, and use RANSAC to mask/homographize this image. Then, we use a perspective transform to find the top left and bottom right x-y coordinates for the bounding box. As a debugging tool, we used matplotlib to visualize the bounding box on the training image.

After much testing, we realized that SIFT works pretty badly at identifying features on the cone. Because of how homogenous the cone looked, SIFT had difficulty finding actual features to match on the cone. At most, SIFT would be able to identify 4 or 5 good feature matches of the cone, which was definitely not enough matches to draw a bounding box.

<center><span>![SIFT Feature Matching Cone](assets/images/lab4/SIFT_Feature_Matching_Cone.png =700x500)</span></center>

<center>**Figure 4.5: SIFT Feature Matching of Cone**</center>

<center><span>![SIFT Features Cone](assets/images/lab4/SIFT_Features_Cone.png =700x500)</span></center>

<center>**Figure 4.6: SIFT Features of Cone**</center>

Out of curiosity (and mainly to make sure that it wasn’t a bug in our code that was causing SIFT to fail), we used a different set of image data to verify that SIFT was indeed working correctly. We used images of Honey Oats Cereal as the new template and training images. As shown in the image below, SIFT was able to accurate identify many features in the Honey Oats Cereal and correctly draw a bounding box around the major features of the cereal box.

The results from applying SIFT on cone and honey oats cereal box images showed us that although SIFT works very well in images with many corner features, it does not work well for images with mainly homogenous features. We concluded that it was probably best not use SIFT to detect the cone/line for the purposes of this lab.

<center><span>![SIFT Features Cereal](assets/images/lab4/SIFT_Features_Cereal.png =600x500)</span></center>

<center>**Figure 4.7: SIFT Features of Cereal Box**</center>

<center><span>![SIFT Bounding Box](assets/images/lab4/SIFT_Bounding_Box.png =600x500)</span></center>

<center>**Figure 4.8: SIFT Bounding Box of Cereal Box**</center>

### Template Matching

The second method we attempted to use for cone detection was template matching. This method applies an edge detection algorithm over a template image, and then loops over different scales of the test image, to try to find and match features between the two images using various error detection algorithms for template matching on OpenCV. These error detection algorithms include: CCOEFF, CCORR, and SQDIFF. We decided to use CCORR because it found the cone most accurately and passed the most test cases. From the error detection algorithm, we get the max value of the point with the most intensity/highest matches, compare it to the current max value, then update the the current “best match”. We then use the best fitting match to find the object in the test image, in order to create a bounding box around the cone.

It was interesting to see the different cone detection algorithms available, and analyze what makes them work/not work in certain situations. For the template matching method, the success of the algorithm depended on the type of matching/error detection algorithm used (ie. ccoeff, ccorr, sqdiff). Each of these methods still failed some test cases, but we found that the ccorr error detection algorithm did the best (aka. failed the least test cases) in finding the cone.

<center><span>![Template Match Success](assets/images/lab4/Template_Match_Success.png =600x500)</span></center>

<center>**Figure 4.9: Template Matching Success**</center>

<center><span>![Template Match Failure](assets/images/lab4/Template_Match_Failure.png =600x500)</span></center>

<center>**Figure 4.10: Template Matching Failure**</center>

### Color Segmentation

The third method we used for cone detection was color segmentation. This method searches for the cone using its color value. Once all the pixels matching a particular color value are found, the smallest rectangle that fits all those pixels is drawn as the bounding box. In order to create a more robust cone detection algorithm, RGB (Red, green, blue) images were transformed into HSV (hue, saturation, value) images using the OpenCV function BGR2HSV. HSV images are much less sensitive to fluctuations in brightness and color which make them more useful for color matching purposes. The HSV values of the cone were then experimentally determined to set an upper and lower bound that encompassed the color range of the cone. Using these two bounds, a binary filter was applied on the image returning a black or white pixel for HSV values outside or inside the bounds respectively. This created a black and white “mask” that highlighted the area containing the cone. In order to separate the cone shape from random noise, the mask was filtered using the OpenCV erode function which uses an n-sized filter to delete isolated pixels within the size of the filter. We used a 3x3 pixel-sized filter and ran two iterations to ensure a clean mask. Once our mask was filtered, we used the OpenCV dilate function to fill in gaps and increase the size of our supposed cone. This function uses the same method as erode whilst creating pixels instead of deleting them. We experimentally determined that 5 iterations of the dilate function gave us the best results. Once the mask was filtered and dilated, the OpenCV rectangle function was used to find the coordinates of a rectangle containing all points in the mask. This was our bounding box that contained the cone. We found this method to be the most reliable for locating the cone. Using our test cases as a metric, color segmentation was able to locate every cone in the test images with an accuracy metric of ~85%.

<center><span>![Color Segmentation](assets/images/lab4/color_segmentation.png =800x200)</span></center>

<center>**Figure 4.11: Color Segmentation Success**</center>

### Actual Implementation

After testing the three cone detection methods, we found that color segmentation was the most reliable at detecting the cone, and thus used this method in our actual implementation for detecting the cone and lines in robot_parking and line_following.The rectangle finder node finds the cone from the masked image using color segmentation. It listens to the masked_image_topic and converts the image from RGB to HSV. HSV coloring simplies color matching, since oranges of similar hue will be grouped together. We use OpenCV.inRange to identify the coordinates for all orange in the image. We then use a weighted average to determine the middle of the cone, so that extraneous noise is virtually ignored when computing the center of the cone. We then draw and publish the bounding box to rectangle_finder_image_output_topic (for visualization purposes) as well as the center of the cone as ROS Point message to the bounding_box topic (for use in coordinate transformation and path planning).

<center><span>![Bounding Box](assets/images/lab4/Bounding_Box.png =700x500)</span></center>

<center>**Figure 4.12: Bounding box of cone with bottom center identified**</center>

## Locate the Cone (Coordinate Transform) - Kolby, Jerry, Sabina, Ravi

### Overview and Motivation

With only the location of the cone in the reference frame of the image, the robot does not have enough information to determine its distance from the cone. However, equipped with the coordinates of the bounding box of the cone, the intrinsic properties of the camera, and the geometry of the camera relative to the robot, we can mathematically determine the coordinates of the cone relative to the robot. This will inform the robot how far away it is from the cone which is a first step in making the robot follow the cone.

### Approach

The approach taken for this section was purely mathematical. The equation for converting from robot to pixel coordinates is shown below. Note that this results in a set of *homogeneous* coordinates of a pixel in the image.

<span class="image main">![Coordinate Transform Equation](assets/images/lab4/coord_trans_equation.png)</span>

<center>**Figure 4.13: Equation used to find homogeneous form of pixel coordinates from camera matrix, extrinsic matrix, and real world coordinates**</center>

The 3x3 matrix shown is known as the intrinsic camera matrix. We obtained the values for this matrix by observing the calibration settings for our zed camera. The 3x4 matrix is known as the extrinsic matrix, which represents rotation and translation between the robot and camera coordinate frames. Consult the figure below to see how these coordinate frames differ.

<span class="image main">![Robot and Camera Coordinate Frames](assets/images/lab4/robot_cam_coord.png)</span>

<center>**Figure 4.14: Coordinate frames of the robot and its camera**</center>

The following relationships are clear from the image: the positive x-axis of the robot corresponds to the positive z-axis of the camera, the positive y-axis of the robot corresponds to the negative x-axis of the camera, and the positive z-axis of the robot corresponds to the negative y-axis of the camera. This information determines the rotational portion of the extrinsic matrix. Taking the center of the rear axle as the origin of the robot coordinate frame, we measured the translation of the camera lens to complete the extrinsic matrix.

We now have what we need to go from robot coordinates to pixel coordinates, but this is not what we want; and at this point, we cannot invert this matrix product to solve for the robot coordinates because this product is invertible. This is where another matrix, which we referred to as the floor_to_world_matrix, came into play. Jerry identified a 4x3 matrix that converts 2-D coordinates on the floor (an assumption that the cone will always be on the floor) to 3-D coordinates. This matrix, when right-multiplied with the product of the intrinsic and extrinsic matrices, yields an invertible 3x3 matrix. Now right-multiplying the vector of pixel coordinates with this inverted matrix yields a vector of homogeneous coordinates in the robot frame, and we convert these to cartesian coordinates by simply dividing this vector by its last element.

## Robot Parking - Sabina and Jerry

### Overview and Motivation

This section of the lab integrated the work of the first two sections (detecting the cone and locating the cone) in order to make the robot drive towards a cone and park within a specified distance of it. Successful completion of this task would validate previous work and provide proof that the robot could potentially follow a specified path by continuously identifying a new target point and driving towards that point.

### Approach

The robot parking algorithm makes the robot locate an orange cone, drive towards it, and stop 1 meter away from the cone. This node takes in real-world x-y coordinates of the target point as inputs, and publishes drive commands to the robot.

The robot_parking package uses the real-world x-y coordinates of the target point, and uses the current distance, current angle, and specified parking goal distance to calculate the new speed and new angle. Robot parking uses a simple PD controller, using the following calculations:

<center>new\_speed = k\_d * (current\_distance - goal\_distance)</center>
<center>new\_angle = k\_theta * current\_angle</center>

The updated speed and angle parameters are then published to the ROS Ackermann Drive topic `/vesc/ackermann_cmd_mux/input/navigation` to drive the car.

<center>[![Robot Parking](assets/images/lab4/robot_parking.png =600x400)](https://youtu.be/CEDcssmEmWA "Robot Parking")</center>

<center>**Video 4.1: Robot Parking**</center>

<center>[![Cone Following](assets/images/lab4/cone_following.png =600x400)](https://youtu.be/0JsqiUC1mjM "Cone Following")</center>

<center>**Video 4.2: Cone Following**</center>

## Line Following (Pure Pursuit) - Jerry

### Overview and Motivation

The last task of this lab was to create an algorithm which makes the robot follow a specified path, or more specifically, a line of orange tape placed on the floor. This task was the culmination of all the tasks that came before it. We were excited to tackle this challenge not only because it was required by this lab, but also because of what it could mean for the future. If we could make the robot follow a simple path, then it would be possible in time to make the robot autonomously navigate increasingly complex routes.

### Approach

We implemented the Pure Pursuit algorithm to follow an orange tape line on the ground. Pure Pursuit is an algorithm in which we assume the robot moves in a manner similar to a bicycle, and calculate the angle required for the robot to turn smoothly in an arc to reach a desired target point.

<center><span>![Pure Pursuit Geometry](assets/images/lab4/pure_pursuit_geometry.png =950x600)</span></center>

<center>**Figure 4.15: Figure taken from [this paper from the DARPA grand challenge](https://www.ri.cmu.edu/pub_files/2009/2/Automatic_Steering_Methods_for_Autonomous_Automobile_Path_Tracking.pdf). Shows the desired steering angle given current orientation and distance from target point**</center>

To find the target point, in typical implementations of the Pure Pursuit algorithm, one would find a point on the line a certain "lookahead" distance ahead, but for simplicity, we simply mask off most of the camera image except for a section which would roughly correspond to the desired lookahead distance and run the cone detection algorithm. Given a target point, we find the desired turning angle using the bicycle model, and calculate the desired driving speed based on the turn radius, so that we drive more slowly on sharper turns.

<center>[![Simple Line Follower](assets/images/lab4/simple_line_follow.png =600x400)](https://youtu.be/r_twc_SNtNc "Simple Line Following")</center>

<center>**Video 4.3: Simple Line Following**</center>


<center>[![Circular Line Follower](assets/images/lab4/complex_line_follow.png =600x400)](https://youtu.be/m5QCN0QVLhM "Circular Line Following")</center>

<center>**Video 4.4: Complex Line Following**</center>

## Team Workflow Updates - Ravi

We added a battery pack and Raspberry PI ethernet bridge to our router, so we are not limited to locations with wall outlets and network jacks when working on the robot. We also published the racecar_ws folder to github, with all packages configured as submodules. We have a script that automatically pulls the latest code (on the master branch) from github, so our robot code and virtual machine code stay in sync. This time investment simplified debugging for this lab and future labs.

<center><span>![Router](assets/images/lab4/router.jpg =950x450)</span></center>

<center>**Figure 4.16: Wireless router modification**</center>

## Lessons Learned - Electrons

We think the lab this week provided a good learning experience. We made certain observations on account of our techincal hardships that should prove to be useful moving forward. Likewise, we learned certain lessons about communication that should make us more productive in the future. Interestingly, some of our communication issues this week led to some technical challenges. For instance, failure to ask for help on a particularly challenging section led to a bottleneck in workflow and put more stress on the team. This was just our second week together, however, and it is a learning process. We will continue to grow and improve as a unit thanks to the lessons learned each week.

### Technical Conclusions

Throughout this lab we made observations about what made us more productive as well as things that hindered us at times. For the latter, we noted the difficulty in taking certain things from simulation to the real world. For instance, when calibrating the color segmentation algorithm for object detection, we had to carefully consider what imperfect conditions may come with the real world implementation. Testing in different locations can result in slightly different lighting which can greatly affect the results of our object detection, so this was frustrating to account for. Furthermore, we noted that theoretical models require very precise measurements. This fact manifested itself during our coordinate transform (locating the cone) section. We took the theoretical route towards converting from pixel to real world coordinates, which assumed certain conditions. However, when calculating the extrinsic matrix, it was very hard to account for the slight tilt of the camera. Until we finally quantified this tilt (which was about 3 degrees), our extrinsic matrix was incorrect and we could not accurately determine the real world coordinates of the cone.

Despite our challenges, we were delighted by the realization that modularity makes our lives much easier. For example, much of the code that led up to robot parking could also be used in line following. In both cases the robot needs a target point to navigate towards, one is just defined by a cone while the other is defined by a line of tape. This also allowed us to parallelize the tasks. We were able to have people working on the robot parking and line following algorithms alongside the object detection and location algorithms, because we assumed that the former functions would just be fed in data produced by the latter functions.

### CI Conclusions

From a communications perspective, we learned the importance of asking for help sooner rather than later. There was a point where the workflow got backed up because coordinate transform was proving to be a bigger challenge than expected. Kolby was the lead on this section, and he tried for a while to figure it out on his own. However, the team could have been more productive if he had asked for assistance farther in advance, and also if the team had reached out to him. On that note, this lab exposed the need for team members to take on roles that align more with their expertise. In the future, especially on labs that require a similar division of labor, every team member should communicate which part(s) they feel most comfortable completing.

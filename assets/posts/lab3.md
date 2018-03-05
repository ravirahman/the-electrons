Lab 3
=====

## Overview and Motivations - Kolby

Though far from a self-driving car, a wall-following robot is a significant step in understanding such a technology. This lab called for the application of a wall-following algorithm, as well as a safety controller to avoid high speed crashes, to the robot. Essential to this task was the communication of data between ROS nodes, an efficient way to extract and manipulate meaningful information from this data, and the tuning of a PID controller to settle quickly and while minimizing overshoot. Most of the code was written in the previous lab, but extra thought was devoted to how to ensure the car's safety when approaching obstacles. In the bigger picture, this lab gives a sense of the algorithms and controllers that go into the brains of a self-driving car. This is an essential foundation both for being successful in the labs going forward and for understanding the complex challenges associated with autonomous driving technology.

## Proposed Approach - Kolby, Jerry, Sabina

### Initial Setup - Kolby

This was the first lab to be completed in teams, and it was also the our first exposure to the robot. Therefore the first order of business was to understand the basics of the robot: how to charge its components, how to power it on and off, and how to communicate with the robot. Then came the more technical side of the lab. In the previous week each team member independently developed wall-following code and ran it in a simulated environment. Jerry had the best-performing code according to his test scores, so we decided to use his code as a starting point. To get this code on the robot, Jerry SSHed into the robot and cloned his wall-following repository.

At this point the robot was fairly capable of following walls. All that remained was a bit of debugging with the velodyne LIDAR and the new task of this week's lab: implementing a safety controller to avoid crashing into obstacles at high speeds.

### Technical Approach - Jerry

Our code for the wall-following robot has two major components: the wall-following code itself and a safety controller which prevents collisions. The wall follower is a modified PID controller based heavily on Jerry's lab 2 wall follower implementation, which uses a linear regression to detect the wall, computes a desired angle to approach the wall at, then sets the steering angle accordingly. The safety controller, also written by Jerry, detects the closest obstacle in front of the robot and computes a maximum safe speed based on the distance to that obstacle, and clamps the speed of the robot to that safe speed. The code is fully vectorized in numpy to optimize performance speed, and variables have been parameterized for flexibility.

### ROS Implementation - Sabina

The ROS architecture is depicted below. The nodes of the system are represented by the colored boxes, and the topics are the values along the arrows.
The high-level ROS structure of the wall-following code is to listen to laser scan data by subscribing to a scan topic and to publish appropriate steering commands to the output topic, which in turn tells the motor what to do. The corresponding structure for the safety controller is to listen to both laser scan data and the output topic. This allows the safety controller to intercept the driving command that is being published by the wall follower, use the laser scan data to assess the current situation, and publish its own driving commands if the car is in danger of crashing. There is also an additional node, called Velodyne laser adjuster, which acts as an intermediate correctional node before the velodyne laser scan data is sent to the wall follower and safety controller nodes. Fairly late into the lab it was discovered that the velodyne LIDAR does not point directly to the front of the car but rather to the side by about 55 degrees. This intermediate node adjusts all of the readings to account for this angle offset.

The team also included more specific implementation considerations. For example, the code is fully vectorized with numpy operations. This allows for more efficient algorithms using numpy functions than an iterative approach. Additionally, both the wall follower and safety controller have visualizations which assist in debugging by seeing what the robot's brain is doing compared to what it should be doing. Finally, essentially everything was made as a parameter. This makes the code more ready for change. For example, if for some reason the safe stopping distance needed to be modified, one could simply change the parameters associated with that formulation rather than hunting down every instance of it in the code.

<span class="image main">![](assets/images/lab3/node_architecture.png)</span>

#### Wall Follower - Jerry

The wall-following code begins by selecting the portion of the laser scan data which is both on the side of the robot the wall is supposed to be at as well as in front of the robot (so the angle must be between 0 and pi/2 radians). We filter out points at the max range of the laser scan, which are assumed to be the laser not hitting anything and are not part of the wall. The code then uses a least-squares linear regression to estimate the location and angle of the wall. Once the wall is located, the code uses a modified PID controller based on the difference between the robot's distance to the wall and the desired distance to the wall. The derivative of this difference is computed algebraically from the robot's orientation relative to the wall. The integration term is computed with anti-windup behavior, such as the integration term decaying exponentially over time, so that the behavior is more controlled when the robot starts far away from the nearest wall. The output of the PID controller is the desired angle of approach to the wall, which is clamped at absolute value 1 radian because the robot may lose track of the wall if it starts to approach it head-on. Finally, the steering angle is simply set to the difference between the robot's angle to the wall and the desired angle to the wall. Furthermore, we used rviz to check that the robot correctly detected the walls from the laser scans, and to visualize the planned calculated path.

#### Safety Controller - Jerry

The safety controller begins by detecting the distance to the nearest obstacle in front of the robot. It slices up the laser scan data into small segments, and averages over the scanned distances in these segments, in order to reduce noise. Each segment is 0.02 radians, so we can detect a 2cm-wide obstacle at a distance of 1 meter. Based on the angle and distance of each segment, we compute which segments are directly in front of the car, and compute the minimum distance to these segments. We assume that the stopping distance of the robot is proportional to the square of the robot's speed, and correspondingly compute the maximum safe speed so that the robot can stop a specified distance away from the nearest obstacle. If the robot is trying to move faster than this maximum safe speed, we publish a command setting the robot's speed to the maximum safe speed instead. We also considered writing a safety controller which could also turn to avoid obstacles, but decided that such a controller would have to be too complex for us to implement. We also used visualizations on rviz to check that our code correctly detected obstacles, and maintained a safe distance based on the requested speed.

#### Velodyne Laser Adjuster - Sabina

In order to account for the Velodyne’s angle offset, we made a node called “velodyne\_laser\_adjuster” that subscribes to the “/scan” topic. The node adds the angle offset to the /scan data, and publishes the adjusted scan data to the “/scan\_adjusted” topic. Furthermore, after experimenting with the Velodyne sensor, we realized that instead of scanning and publishing scan data for the entire range of angle values at once, the Velodyne actually only scans the left side or the right side at once, and publishes the left and right laser scan data separately. Thus, the “velodyne\_laser\_adjuster” node not only accounts for angle offset from the Velodyne, but also combines the left and right laser scan data into one complete laser scan dataset to be published to the “/scan\_adjusted” topic, where the wall\_follower node now subscribes to (instead of the /scan topic) for the updated scan data.

## Experimental Evaluation - Ravi, Sabina, Marek

This lab was essentially an extension of the previous lab to real world conditions. The previous lab called for the creation of wall-following code and implementation of PD or PID control, but all testing was carried out in a simulation. In this lab the team experimented with how that code performed on the actual robot, as well as with a safety controller to prevent collisions.

### Testing Procedure - Sabina

#### Velodyne Laser Offset

We realized that the velodyne sensor was offset after attempting to run the safety controller on the actual robot, and having the robot not respond as expected. From running the safety controller on simulation, the robot should stop immediately after realizing that it was less than or equal to 1 meter away from an obstacle. However, after running the safety controller on the actual robot and analyzing the laser scan data, we realized that the robot was not actually recognizing obstacles in front of it. From both the scan data and experimental evaluation, we deduced that the velodyne sensor was offset by around 55 degrees (0.95 radians) to the right of 0. We tested the angle offset by placing an obstacle in front of the laser scanner at various angles, and observing if the robot sensed the obstacle.

<span>![](assets/images/lab3/offset_left.PNG =300x600)</span>
<span>![](assets/images/lab3/offset_center.PNG =300x600)</span>
<span>![](assets/images/lab3/offset_right.PNG =300x600)</span>

#### Wall Follower

We tested the wall follower by having the robot follow the walls of the MIT underground tunnel. From the video, we can see that the racecar does a swoop out in the beginning to get exactly one meter away from the wall. The wheels can be seen turning back and forth to adjust for the racecar distance using the PID controller, and correctly stays a distance of 1 meter away while following the wall afterwards.

<center>[**Wall Follower**](https://drive.google.com/file/d/18ZdSuFjE9J6yzr5LhrMTdYToe_ZhQqoQ/view?usp=sharing "Wall Follower Video")</center>

#### Safety Controller

We tested the safety controller by putting obstacles of various sizes and angles in front of the racecar, and observing if the robot stops.  We conducted three tests: having the racecar stop 1 meter away from a wall, stop before a corner, and stop in front of a small obstacle. These tests show that the racecar can accurately detect large objects, as well as small objects in front of uneven backgrounds.

<center>[**Safety Controller: Wall**](https://drive.google.com/open?id=1Vsw8tKgdKCHJHYEcVc7z3wFYocqH7hmK "Safety Controller: Wall")</center>

<center>[**Safety Controller: Corner**](https://drive.google.com/open?id=1p3PMP0atJT_8RNU1ANLfFGPy_DYX868S "Safety Controller: Corner")</center>

<center>[**Safety Controller: Pedestrian**](https://drive.google.com/open?id=1SzcJMI-59TZ_5ML5HyCh7h0lW9mKYOza "Safety Controller: Pedestrian")</center>

### Results - Marek

In both a simulated and physical environment, the robot is currently capable of safely stopping in front of an obstacle, following a wall, and implementing both features simultaneously. The safety controller is capable of seeing an obstacle, safely adjusting speed when approaching it, and stopping before colliding with it. Both the safety controller and wall follower subscribe to the laser scan and publish to the robot. When run with the wall follower, the safety controller’s messages take priority when the laser scan data indicates an obstacle in front of the car.

<center>[**Wall Following and Safety Controller**](https://drive.google.com/open?id=1GprdgOWhVJPOxWh7ENvJbyrfXyzNAoF5 "Wall Following and Safety Controller")</center>

## Lessons Learned - Jerry, Kolby, Marek

When it comes to technical and communications conclusions, one thing that stands out in both is that simplicity is sufficient. Some team members found while writing their wall-following code that a more involved algorithm such as RANSAC may not be necessary or even better than a simple linear regression. On the communications side, we also decided to keep things somewhat simple. Instead of using Slack or some other sophisticated team management application, we decided that Facebook Messenger would suffice for our needs. It is fast, easy, and accessible, and that is all we really need.

We stumbled slightly when it came to the technical part of the lab, but the important thing is how we quickly pulled together to find a solution. This is a good sign for the future, especially considering this was our first team lab of the semester.

We got a glimpse of each member's working and learning style and personality, and moving forward we will continue to learn more about each other. As we learn more about each member's strengths, weaknesses, and goals we may function better as a team and help each other achieve our goals for the semester and beyond.

### Technical Conclusions - Jerry

Over the course of writing the wall follower, Jerry was reminded that simpler solutions are often better. After squaring away a linear regression, he experimented with using RANSAC, but this led to worse performance around corners due to what it classified as outliers. Additionally, we stumbled just a bit due to the velodyne laser offset which was not initially taken into account. We took this is in stride, running tests to determine this offset and improve the performance of the safety controller.

### CI Conclusions - Marek

In order to communicate as a team, we set up networks for structured communication and data management. For instant messaging, we chose Facebook messenger due to its accessible platform and easy use. For code and other files that require robust version control, we created a Github organization in which we’ve created a repository for each ROS package being used by our robot. For real time file editing we chose to use Google Drive. This allows us to work on lab reports and presentations synchronously. It is also used as a storage space for our video files which are too large to effectively store on Github.

In terms of task delegation, we used Git issues to assign tasks to individual team members. We appointed a lab leader whose responsibility was to appoint these tasks and make sure they are getting done. Soft time deadlines were set for presentations and write ups. Team meetings were also scheduled to work on technical tasks and practice presentations. We plan to keep using this organizational structure for future labs.

## Future Work - Kolby, Marek

We are happy with the progress made so far, but are eager to improve upon and expand the capabilities of the robot. One area for improvement is the safety controller. Specifically, we wish to make it more robust so that instead of simply slowing down or stopping near obstacles, the robot maneuvers around obstacles with great agility. Related to this idea is how the car behaves at faster speeds. Using some mathematical or physical model relating current speed and distance from obstacles, the robot could better predict the future and understand what it needs to do under certain circumstances. This model could potentially be developed by the team through further experimentation.

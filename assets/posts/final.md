# Final Report - Fast Collision Avoidance 

# Abstract (Ravi and Marek)
This Fast Collision Avoidance challenge requires the RACECAR to navigate through an unknown environment at high speeds and with zero obstacle collisions. The final implementation consists of three main components: obstacle detection and path planning, path following, and safety-induced dynamics readjustments. After detecting obstacles in real-time using LIDAR data, and combining orientation data from the Inertial Measurement Unit (IMU) (less than 0.1 rad error over a curved 20 meter test course), the greedy path planner returns locally-optimal paths towards the goal at 20Hz. The path following controller, adapted from a pure pursuit controller, actuates the robot. Finally, the Safety Controller overrides the published drive commands as needed to prevent collisions. Each component runs at 20Hz. This approach successfully enabled the RACECAR to safely navigate through unknown courses at an average of 1.95 m/s.
<center>
    **Figure 1: Video Abstract**<br />
<iframe width="640" height="360" src="https://www.youtube.com/embed/iVEiKpk274k" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</center>


# Intro (Kolby)
## Overview & Motivation: Avoiding Obstacles in Real Life
Fast Collision Avoidance requires the RACECAR to navigate through an unknown course at high speeds. This real-world challenge emphasizes both safety, since collisions resulted in a disqualification, and speed, the primary metric for scoring. A collision avoidance component is necessary for self-driving cars, because obstacles on the road, such as other cars, are often not known in advance.
## Proposed Approach 1: Global is Too Complex
We initially attempted a complex and heavyweight but globally correct approach, but we realized it was both unwieldy and unnecessary. In this approach, a LIDAR-based simultaneous localization and mapping (SLAM) algorithm would place the robot in a global frame, thus allowing a path planner, such as RRT, to identify a drivable, obstacle-free route towards the goal. A Pure Pursuit controller would then follow the path and a safety controller would correct for path following errors to prevent obstacle collisions. Upon initial testing and further consideration, SLAM did not offer the required speed or precision for this challenge, and was also difficult to implement efficiently. We also realized that global localization and path planning was unnecessarily complex for this challenge, as we discuss below.
## Proposed Approach 2: Local is Simple
Our second approach instead computed locally-optimal paths using a LIDAR and IMU-based greedy path planner, which was substantially easier to implement than a globally correct approach. Orientation estimates, derived from the IMU, enabled calculation of the goal direction. The path planner constructed Dubins paths (the shortest path between two poses with a limit on curvature) through unoccupied space (as determined by the robot's LIDAR) towards the goal. Because the challenge description stated there would be no "dead ends", it is sufficient to plan paths locally in this manner. Similar to the initial approach, the pure pursuit algorithm would be used for path following and safety controller would correct for path following errors to prevent obstacle collisions. This was the approach we ultimately decided to use.

# Design/Algorithm
## Conceptual System Overview (Marek)
The system for the Fast Collision Avoidance challenge consists of three major technical components: a greedy IRN<sup>1</sup> path planner, a pure pursuit path follower, and a safety controller. The IRN path planner first computes a navigable region (from LIDAR data) and then computes an obstacle-free path to the furthest LIDAR point in the goal direction. On every timestep, the RACECAR updates this path to avoid newly discovered obstacles. The next component, a Pure Pursuit path follower, finds an appropriate lookahead point on the path and then actuates the robot towards that point. The safety controller then checks that obstacles ahead of the robot are a safe distance away. If not, it navigates the robot away from obstacles, and if necessary, lowers the robot's speed. When run simultaneously, these three components ensure the robot can traverse an obstacle-ridden path safely and swiftly.

<sup><sub><sup>1</sup>IRN stands for InstantRahmanNoodle. This name was inspired by our teammate Ravi Rahman developing this algorithm. In this case, we interpret paths as noodles and return them instantly.</sub></sup>

## Algorithms
### IRN Path Planning Algorithm: a Greedy Planner (Ravi)
The IRN path planning algorithm has three steps:

1. It computes a set of Dubins paths from the robot's current pose in several different directions.
1. It determines how far the robot can drive along each path based on LIDAR data, and truncates each path to that length.
1. It scores each path using a heuristic to determine which path is most likely to bring the robot towards the goal, and outputs the path with the best score.

On each timestep, the IRN algorithm draws a set of Dubins paths which lead the robot in a variety of different directions. A Dubins path connects two poses with the shortest path given a curvature constraint. This limit on curvature accounts for the RACECAR's minimum turning radius. The start pose for each Dubins path is the robot's current pose; the end poses are uniformly spaced out in different angles from the robot, where each pose is located as far as the robot's LIDAR can see in that direction, and is oriented towards the goal area.

The IRN algorithm then truncates each Dubins path to the furthest point along the path that the robot can drive to without colliding with an obstacle. For each path, the algorithm samples evenly-spaced points along the path and determines the first point, if any, where the robot will collide with an obstacle which was detected by the most recent LIDAR data. In doing so, the algorithm must account for the dimensions of the robot, and check not just whether an obstacle lies along the path itself, but rather any obstacles are close enough for the robot to collide with while following the path. Each path, if an obstacle lies along it, is then truncated so that the remaining path is collision-free.

Once the IRN algorithm has truncated each path to be collision-free, the paths are scored to identify and return the path which will best lead the robot to the goal area. If there are no collision-free paths, the algorithm triggers an emergency stop. If paths do exist, paths are scored using a heuristic; we describe the heuristic we used below in the Implementation section on the Path Planning algorithm. Figure 2 below gives an example of the paths planned by the IRN algorithm.

<center>**Figure 2: IRN Algorithm**<br />
    ![IRN Algorithm*](https://github.mit.edu/pages/rss2018-team12/assets/images/final_project/best_path_selection.PNG =648x370)<br/>
_This diagram illustrates the main components of the IRN Algorithm. In the left figure, the green lines represent a sample of the Dubins paths found. The white dots represent the limits of the navigable space. In the right picture, the remaining green line represents the path with the highest score that is then pursued. Note that the goal is towards the top of the picture._
</center>

### Pure Pursuit (Ravi)
The Pure Pursuit path follower, adapted from the [previous lab](https://github.mit.edu/pages/rss2018-team12/#lab6), smoothly actuates the RACECAR along the path returned by the path planner. The path follower finds a lookahead point on the path a fixed distance from the robot. It then computes an appropriate steering angle and speed to reach this point. Finally, these motion commands drive the RACECAR.

### Safety Controller: Last-Resort Obstacle Dodging (Kolby)
The safety controller intercepts the drive command issued by the Pure Pursuit algorithm and, if it is unsafe, issues a safer drive command to override it. It operates independently of the path planner and follower, and as much as possible relies directly on sensor data, so as to be robust to any bugs in the path planner or follower.

Given the intercepted drive command, the safety controller predicts the path which the path follower intends to follow, and if it is unsafe, considers a number of alternative navigable paths, and returns an appropriate drive command for the safest alternate path. The safety controller assumes that the robot will turn in an arc with a constant steering angle (i.e. the steering angle in the intercepted drive command) for some duration and then drive forward in a straight line. The algorithm determines the maximum speed the robot can drive at and still stop in time if it were to follow a path of this form. If the desired speed in the intercepted drive command is greater than this safe speed, the safety controller examines a number of alternative paths, and if any of them have a higher maximum safe speed, issues a drive command to follow the best alternative path. Figure 3 below illustrates an example alternative path when the robot is driving head-on towards a wall. If no alternative path is safer, the safety controller re-issues the original intercepted drive command, but at a lower, safe speed.

<center>**Figure 3: Alternative Path from the Safety Controller**<br />
    ![Safety Alternative Path*](https://github.mit.edu/pages/rss2018-team12/assets/images/final_project/safety_alternate_path.PNG =335x277)<br/>
_The above diagram illustrates an alternate path drawn by the safety controller. The Blue shape represents the RACECAR; the white line is a wall. The red line shows the original path returned by the path planner. The safety controller computes the Green path to navigate around the wall._
</center>


### Simultaneous Localization and Mapping (SLAM) (Sabina)
Simultaneous Localization and Mapping, also known as SLAM, enables the RACECAR to build a map of its environment while also localizing itself within this map in real-time. "Localization" involves inferring the RACECAR's pose given a map, while "Mapping" involves inferring a map given a known location. Traditionally, localization requires a map, and mapping requires localization. SLAM solves this recursive challenge while initially knowing neither.

Initially, we wanted to use a variant of the Particle Filter SLAM. Using localization and mapping as a two-step iterative process, our SLAM algorithm would alternate between localizing in one timestep and mapping in the next timestep. 

In this SLAM algorithm, the RACECAR localizes itself using the particle filter algorithm, also known as Monte Carlo Localization, from [lab 5](https://github.mit.edu/pages/rss2018-team12/#lab5). Given an map skeleton (containing only some obstacles), along with odometry and laser scan data, the particle filter algorithm uses motion and sensor models to update the probability distribution of the robot, enabling the robot to localize itself based on the most likely pose from this distribution, assuming the map skeleton is the true map.

Using the last updated pose from localization, mapping then updates the occupancy grid using a simple sensor model and Bayes' Rule. The occupancy grid contains the probability of there being an obstacle at a particular location. The updated map from mapping is then used as the new map for localization in the next timestep. 

Through this continuous iterative process between localization and mapping, the RACECAR updates the map with new obstacles during mapping, and then localize both the obstacles as well as itself within this new map during localization, enabling the robot to simultaneously localize and map in real-time.

## Major Decisions (Kolby)

### Local Path Planning instead of Global

We switched from our original intent to use a global RRT-based path planner to a local, greedy path planner. From Professor How's feedback for our technical plan, we realized the latter approach was better suited for this challenge. Without a complete map of obstacles, the robot would need to completely abandon its path and construct a new path in the face of new obstacles. A local path planner can accomplish this task more efficiently, since it does not plan further ahead than what can be safely navigated. It also does not require a map, and needs to know only the direction of the goal.

### Using onboard IMU for Orientation

We switched to using the IMU for orientation instead of using localization or SLAM, because the IMU is simpler and isn't prone to catastrophic failure. Preliminary testing confirmed the precision of this approach (less than 0.1 rad error over a 20 meter, twisty test course). The greedy path planner only requires orientation data (it does not require a global position) since it moves the robot along longest possible unobstructed paths toward the goal. Because of the precision and simplicity of IMU-based orientation, we used this sensor instead of localization pose information. While the IMU will tend to accumulate error over time, we found the error is small, whereas localization is difficult to calibrate in noisy environments and can give completely incorrect data in the event of a loss of localization.

### Abandoning SLAM

We abandoned SLAM after confirming the usability of the greedy IRN path planning algorithm and the accuracy of the IMU. At the time, we had implemented mapping, and SLAM would have required significant resources to fully implement, because it is computationally expensive, and RangeLibC, which we used for fast raycasting, requires substantial time to reinitialize on new maps. Since the IRN planner needed neither a map nor a pose in the global frame, and the IMU provided the necessary orientation data, SLAM added no additional value. Hence, we abandoned it.


# Implementation
Our implementation consists of a Velodyne Laser Adjuster, an IMU Processor, the IRN Path Planner, a Pure Pursuit Trajectory Follower, and a Safety Controller.

## ROS Architecture (Jerry)
<center>**Figure 4: ROS Architecture**<br />
    ![ROS Architecture*](https://github.mit.edu/pages/rss2018-team12/assets/images/final_project/ros_arch.png =300x462)<br/>
_This diagram illustrates the components of our system. First, Laser and IMU Orientation data are adjusted and filtered. This processed data is then passed into the IRN Path Planner, which is split into two nodes for performance reasons: the Safe Scan node, which performs precomputations on the LIDAR data, and the Greedy Planner node, which finds and evaluates Dubins paths. The Pure Pursuit algorithm is integrated into the same node as the Greedy Planner, and issues Ackermann Drive commands. The Safety Controller intercepts this command and overrides it as needed if the LIDAR data indicates that the issued command is unsafe._
</center>

## Handling Quirks in the Velodyne with a Laser Adjuster Node (Marek and Ravi)
Velodyne laser data is pre-processed in its own node to convert the laser ranges into usable data. First, the angles are adjusted, so 0 rad in the RACECAR's frame points forward instead of 60 degrees off to the side. Next, because of the Velodyne's dual mode, only half of the ranges are published on each update. The Velodyne Laser Adjuster combines the previous reading with the current reading to provide a full reading of the surrounding area. Then, the max range is truncated to 30m for better downstream performance.

Velodyne Laser readings marked as \\(\infty\\) could represent either obstacles too close to be detected or actual free space, so the Velodyne Laser Adjuster node updates these ranges to distinguish between these possibilities. If, in the last published adjusted laser scan, the range on that angle and both adjacent angles are less than one meter, the \\(\infty\\) is replaced with 0.4 meters. Otherwise, the \\(\infty\\) was replaced with the maximum range. This approach works because the robot will approach the obstacle first, so before the obstacle gets too close the robot will see a short range. Assuming the obstacle is large enough (e.g. a wall, where the robot can see the wall that is a little off to the side in both directions but not right in front of it), the robot will continue to see the obstacle. Otherwise, obstacles detected in this manner will decay, which prevents the spurious detection of obstacles which would slow down the robot.

This new laser data was published in its own topic for downstream consumption. On the RACECAR, it ran at 20hz, the same frequency as the Velodyne LIDAR scanner.

## IMU Orientation: Simple and Accurate (Ravi)
IMU orientation data, after some processing, is used to compute the orientation towards the goal. Since the IMU is inherently noisy, the raw data is filtered through the [IMU Complementary Filter](http://wiki.ros.org/imu_complementary_filter) ROS Package. This package automatically adjusts for IMU drift to produce an accurate orientation estimate. In preliminary testing, where the robot was driven down a twisty 20 meter test course with the controller and then reversed to the starting pose, the resulting orientation differed at most 0.1 rad from the starting pose. As such, IMU data filtered through this package is sufficiently precise. This package introduces no measurable delay. 

Since the obstacle course is a straight path, we initially position the RACECAR in the direction of the goal. Hence, if according to the IMU data the robot is facing at an angle \\(\theta\\) relative to its initial orientation, the IRN implementation considers the goal to be in the \\(-\theta\\) direction relative to the robot frame. Figure 5 below illustrates this process.
<center>**Figure 5: IMU Orientation**<br />
    ![IMU Orientation*](https://github.mit.edu/pages/rss2018-team12/assets/images/final_project/imu_orientation.PNG =262x549)<br/>
_This diagram illustrates the relationship between IMU orientation and the goal direction. It is assumed that the RACECAR's initial orientation is towards the goal. Hence, the negative change in orientation, relative to the RACECAR's frame, represents the direction towards the goal. This direction is used when planning paths.situations_
</center>

## IRN Path Planner
### LIDAR Preprocessing: Averaging, Dynamic Obstacle Dilation, and Smoothing (Jerry and Ravi)

For performance and robustness reasons, the path planner first coarsens the LIDAR data by grouping adjacent laser scan ranges and averaging them together. The algorithm first divides the laser scan data into segments which are 0.04 radians wide, then averages the measurements to produce one single range measurement for each segment. Measurements which are at the maximum range are ignored in this average, because those are assumed to be noise; however, if more than half the measurements are at the maximum range, then instead the LIDAR is considered to have missed and the outputted range measurement for that segment is instead the maximum range. This process makes the path planner more robust to noise in the LIDAR and also improves performance by decreasing the number of laser measurements which need to be processed.

In order to determine whether the robot will collide with an obstacle while following a Dubins path, the path planning algorithm pre-processes the LIDAR data by dilating the obstacles detected in the LIDAR data by the length of the robot. More precisely, the path planner reduces the range along each angle of the averaged laser data, so the resulting LIDAR ranges represent the maximum distance the robot can safely travel. For each range measurement \\(r\\) in the averaged LIDAR data, nearby measurements which are within the "angular size" of the RACECAR (defined below) which are greater than \\(r\\) are reduced to \\(r\\). For example, suppose the LIDAR shows an obstacle two meters away at an angle of 0 radians, and an obstacle five meters away at an angle of 0.04 radians. Then the measurement at the angle of 0.04 radians will be reduced to 2, because if the robot were to move in that direction, it would collide with the two-meter-away obstacle detected at 0 radians before colliding with the obstacle at 0.04 radians. After this process, each measurement is further reduced by the length of the robot. See Figure 6 below for what the LIDAR measurements look like after dilation. After dilation, the IRN algorithm simply checks points along each Dubins path, spaced 0.25m apart, and verifies that the adjusted laser measurement in the direction of each point exceeds the distance that point is from the robot.

When the robot is moving quickly, the robot should stay farther away from obstacles to account for drift, therefore at each timestep, the IRN implementation computes five distinct dilated laser scans, where the largest dilation assumes the robot is \\(1.6\\) times as large as it actually is. When the IRN algorithm selects paths, if the path does not hit any obstacles even with a larger dilation, the path is given a higher score, and if the path is selected, the robot is allowed to drive more quickly along this path.

Because the "angular size" of the RACECAR is dependent on the laser measurement, for performance reasons our IRN implementation performs dilation only approximately using a discrete approach. In particular, the angular size is computed as
\\(\Delta_\text{angle} = \tan^{-1}\left(\frac{\text{robotlength}/2}{\text{laserrange}}\right)\\)
Namely, if the robot is placed at a distance 'laserrange' away from the origin, \\(\Delta_\text{angle}\\) is the span of the angles which would hit the robot on each side, which determines the number of nearby laser measurements which need to be decreased during the dilation process. Implementing this calculation as well as the adjustments in Python is slow; in order to vectorize this computation, the IRN implementation divides the laser measurements into a series of discrete buckets, where the buckets go from 0 to 20 meters and each bucket is 0.2 meters wide. All the adjustments for the laser measurements in the same bucket are then processed at the same time using a minimum filter. With this optimization, the dilation process takes about 0.03s on the robot to compute all five dilations, which is able to keep up with the 20Hz Velodyne LIDAR.

Finally, because the Velodyne LIDAR is angled slightly upward, some obstacles are sufficiently short that the Velodyne is unable to see them reliably, so the IRN algorithm caches the last three LIDAR readings and, for each angle, uses the shortest measurement across the last three readings.
<center>**Figure 6: Adjusted LIDAR Scans**<br />
    ![Adjusted LIDAR Scans*](https://github.mit.edu/pages/rss2018-team12/assets/images/final_project/safescan.png =208x278)<br/>
_This diagram illustrates the adjusted LIDAR scans. The red lines represent the raw LIDAR data, and the white points represent the adjusted LIDAR ranges when obstacles are dilated for the RACECAR's size. As such, the RACECAR will not collide with obstacles when navigating within the white boundary._
</center>

### Constructing Dubins Paths: Spread Them Out (Ravi)

To select the end pose for Dubins paths, we tried three approaches: greedy, randomized greedy, and uniformly distributed, and ultimately decided to use the uniformly distributed approach. In the greedy approach, the laser ranges with the greatest distance in the direction of the goal were sampled. This approach resulted in nearly identical paths with little variation, since these ranges were very close to each-other. In the greedy-randomized approach, laser ranges were weighted by the distance component in the direction of the goal, and a randomized sample was taken. This approach resulted in slightly more variation than the purely greedy option. However, in the scenario where all poses would require a sharp turn, and that sharp turn would intersect an obstacle, both approaches failed to identify valid paths. As such, our final algorithm selected 130 end poses, where the angle of the end poses to the robot were uniformly distributed in the range \\(\left(-\frac{\pi}{2}, \frac{\pi}{2}\right)\\) in front of the robot. This approach guaranteed all directions were considered and always returned varying path options. Figure 7 below gives a sample of the Dubins paths generated by the robot.

We constructed a new set of paths each time the Velodyne LIDAR updated, i.e. at 20Hz. Note that because the robot does not have global positioning information, paths are computed on each timestep in the robot’s frame.

<center>**Figure 7: Sample Dubins Paths**<br />
    ![Sample Dubins Paths*](https://github.mit.edu/pages/rss2018-team12/assets/images/final_project/uniform_paths.png =264x341)<br/>
_The above diagram illustrates 10 sample Dubins paths drawn by the IRN greedy path planning algorithm._
</center>

### Determining the Best Path: Check all and Select the Best (Jerry and Ravi)
Paths were scored along four criteria:
1. Distance in the direction of the goal
2. Absolute length
3. Navigability at high speeds
4. Consistency with prior paths

The first criterion for scoring paths is that they should bring the robot closer to the goal, so this criterion was given a high weight of 6.0. For this criterion, the IRN algorithm computes the distance of the end of the path in the direction of the goal. However, it is more important that the robot is able to make immediate progress than for the robot to plan a long path. Therefore, the path is truncated to a length of 6 meters for this criterion, and the square root of this distance is used instead of the raw value.

The second criterion for scoring paths is the absolute length of the path, which helps when the robot needs to move horizontally to proceed, and is given a weight of 0.5. In particular, if there is a wide obstacle in front of the robot, it may not be able to see where the opening is which allows it to proceed forward. In this case, the robot should move horizontally until it finds an opening. To encourage this behavior, longer paths, as measured by the distance of the end of the path from the robot, are prioritized over shorter ones. Again, the path length is truncated to 6 meters for this criterion.

The third criterion for scoring paths is navigability, as measured by how fast the robot can travel along it while staying safe, which is given a weight of 2.0. When the robot moves more quickly, it needs to stay further away from obstacles to avoid collisions. Recall from the section on LIDAR Preprocessing above that the IRN algorithm computes several dilated laser scans. If the path is traversable at a higher level of dilation, it is given a correspondingly higher score. However, in order to ensure that the robot tries to make maximum forward progress, the IRN algorithm computes the best path where each path is only scored based on the lowest level of dilation, and then refines the path by considering 17 nearby paths at higher levels of dilation. The intent is that the "greediest" path may bring the robot too close to an obstacle, and adding the navigability criterion causes the robot to choose a similar path which stays further away from obstacles.

The fourth criterion addresses an issue where when the robot approaches an obstacle head-on, the IRN algorithm may oscillate between turning left and turning right, so the algorithm includes a "consistency" criterion with a weight of 0.3. Recall that the IRN algorithm selects 130 uniformly distributed paths; this associates each path with an index in the range 0 through 129. Paths are penalized based on the absolute difference in index with the path returned in the previous timestep.

The path with the highest score is then sent to the path planning algorithm. Figure 8 below gives an example of the path selected using these criteria. This process of collision detection and path scoring takes approximately 4ms on 130 Dubins paths. This is sufficiently fast to keep up with the 20Hz Velodyne LIDAR.

<center>**Figure 8: Best Dubins Path**<br />
    ![Best Dubins Path*](https://github.mit.edu/pages/rss2018-team12/assets/images/final_project/best_path.png =306x401)<br/>
_The above diagram illustrates the best Dubins path, selected according to the above criteria, for the paths identified in Figure 7 above. Observe that the path which takes the robot to the right of the obstacle brings the robot closer to the goal, but the robot is already moving left, therefore IRN selects the path going to the left as preferable over the path going to the right for consistency reasons._
</center>

## Pure Pursuit: Follow the Trajectory (Jerry)
The RACECAR uses a simplified Pure Pursuit trajectory tracker, since paths are computed in the RACECAR's frame. As in previous labs, The algorithm dynamically uses a lookahead distance of 2.8m if the trajectory is straight ahead, or a slightly shorter 2.0m if the path has an angle of at least 0.1 radians. With this lookahead distance, the Pure Pursuit algorithm computes a corresponding lookahead point and steering angle. In contrast to previous labs, the steering angle is scaled by an additional 10% so the Dubins path will be followed more closely. In addition, the algorithm dynamically chooses a drive speed based on steering angle as well as the path length. The drive speed is 4.5 m/s when going straight and linearly decreases to 1.5 m/s at any steering angle at least 0.3 radians. The controller also limited jerk to \\(0.25 \frac{m}{s^3}\\) for stability. Finally, these drive commands were published for RACECAR actuation. Figure 8 below shows the robot using Pure Pursuit in combination with the IRN algorithm in simulation.

<center>
    **Figure 9: Trajectory Following**<br />
    <iframe width="560" height="315" src="https://www.youtube.com/embed/RImgnsDn9yY" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    <br />
_The above figure illustrates the trajectory follower running in the simulated environment. The goal direction is towards the top of the video. The green line represents the planned path, and the red dot shows the lookahead point. The white lines represent the laser scan with obstacles dilated. It takes approximately 12 seconds for the RACECAR to travel 35 meters, indicating an average speed of 2.9 m/s._
</center>


## Safety controller: Last-Second Alternative Planning (Jerry)
Aside from small optimizations, implementing the new safety controller had three main challenges: how to select alternative paths the robot may drive along when the original drive direction is unsafe, how to account for the width of the robot in selecting alternative safe paths, and how to ensure the safety controller is able to run in real time. There are innumerable possible alternative paths the robot can drive, and the controller must intelligently explore them in order to select a path which is safe without deviating substantially from the original desired path of the robot, and must return this path within a reasonable timeframe. The controller must only return a path which the robot can drive along without colliding with obstacles, accounting for the width of the robot. Finally, the controller must be careful to publish a drive command in real time, at the same rate that the original drive commands are being published, or else it will not successfully override all of the original drive commands.

The algorithm balances between completeness and performance by considering a small, fixed set of possible paths, which are likely to approximate the true optimal path of the robot. The steering angles considered by the robot are a sequence of nine angles, spaced 0.1 radians apart, between the maximum possible steering angles (\\(\pm 0.41\\) radians). For each steering angle, the robot considers stopping the turn after 0.5, 1, and 1.5 arc-radians. The controller finds the steering angle closest to the original desired steering angle such that the robot can safely drive along some path corresponding to that angle, at the original desired speed. If such an angle does not exist, the controller finds the steering angle where the robot can safely drive the fastest. If the controller determines that one of the alternative paths has a higher safe driving speed than the original desired path, the speed of the drive command issued is the safe speed along the chosen alternative path, or the original desired driving speed, whichever is lower.

To account for the width of the robot, the controller verifies that two parallel paths, spaced apart by the width of the robot, are both clear of obstacles. The algorithm samples points along each path, spaced approximately 0.1 meters apart, and verifies that the laser measurement in the direction of each point exceeds the distance to that point by a safety threshold of 0.1 meters.

In order for the safety controller to run in real time, the controller is limited to only checking the small number of paths described above, everything is written using numpy, and the algorithm also performs some memoization. One of the advantages of using a fixed set of paths is that the coordinates of all the points on the path are fixed. Therefore, the paths can be memoized between different timesteps, allowing the algorithm to spend more time checking if the paths are traversable. This optimization sped up the algorithm by about 30%.

Finally, as a small optimization for path stability, if the safety controller causes the car to drive along an alternative path, it will cache the angle of the issued drive command and issue a command for the same angle for the next three timesteps. This helps avoid behavior where the safety controller causes the robot to swerve back and forth when approaching an obstacle.

# Evaluation: Test, Test, and Test Some More
## Test Procedures (Marek)
In order to successfully navigate through a pathway of unknown obstacles, the crucial technical sub-components, path planning and the safety controller, had to be implemented and tested. Pure pursuit was not tested individually because the previous implementation was robust and fully functional. Although path planning had previously worked on a static and known map, traversing an unknown environment requires dynamic planning.

The greedy path planner was tested initially in simulation. First, it was tested in an open region to ensure that it would drive in the direction of the goal point. After ensuring that it could identify and construct paths towards the the goal, it was then tested in a limited-obstacle map. This test uncovered the issue of planning paths too close to obstacles which was solved by increasing obstacle dilation. After increasing dilation, the RACECAR could successfully navigate through a limited-obstacle map at slow speeds. This confirmed the applicability of the greedy algorithm for this challenge. Next, testing was conducted at higher speeds. The RACECAR was able to complete a more complicated obstacle course at a max speed of 5m/s, as shown in Figure 10 below.

<center>**Figure 10: Testing in Simulation**<br />
    ![Testing in Simulation*](https://github.mit.edu/pages/rss2018-team12/assets/images/final_project/sim_debug.png =611x290)<br/>
_The above diagram illustrates an example of bug fixed in simulation. The left image shows a path drawn too close teo the black wall. Simulation enabled us to identify an issue with the obstacle dilation. The right image shows the new obstacle dilation (white line) and the resulting path._
</center>

The safety controller needed to recognize when the RACECAR was on a collision course and then safely navigate around the obstacle or stop if otherwise necessary. This was tested initially in simulation: a known map with obstacles was loaded, a path was manually drawn through obstacles, and the RACECAR was allowed to pursue the path in order to evaluate whether it would divert away from the obstacles. The safety controller would actuate based on a calculated safe speed determined by the required stopping distance. The stopping distance was scaled with a multiplying variable that would effectively determine how "scared" the RACECAR was. If this was too high, the robot would stop prematurely. If too low, it would not actuate in time and potentially crash. The final scaling parameter was set at 0.3. 

Once our sub-components were implemented and tested, the main goal was tested in simulation. The test was launched using a single launch file called final\_project.launch which launched our path planner, safety controller, and pure pursuit. A test map was also launched and the robot would attempt to navigate through the environment. The test was deemed successful if the robot could navigate from one end to another without colliding with the unknown obstacles. This was initially tested at a slower speed of about 1.5m/s. Once deemed successful, the speed was increased and tested again. If the test failed, one of the many parameters governing the code would be altered. Mainly, the robot assumed-length, obstacle dilation, and turning tendency weights were altered. RViz visualization was used to facilitate debugging. Testing in simulation determined that the RACECAR was able to successfully navigate through the test map at 5m/s in simulation, 2.25m/s faster than the speed for the max score. 

Once simulation testing was complete, we tested in a real life obstacle path. RViz was used to visualize the important components of the system for debugging purposes such as the current path, obstacles, and alternative paths when safety controller was activated. A similar iterative procedure was used with iteratively increasing speeds as the course was successfully navigated. Due to success being dependent on multiple parameters and factors, testing consisted of smart guesses as to which parameters to change. The main parameters that were altered were min and max speed, robot dynamic dilation, turning tendencies, and obstacle dilation. Testing and visualization uncovered the RACECAR's inability to see shorter obstacles. The RACECAR's movements was also deemed abrupt and jerky. It was discovered that adding a maximum jerk parameter smoothed the speed changes of the RACECAR leading to improved performance. Performance was highly dependent on current obstacle placement. During testing, the RACECAR completed the course at a best time of 8.2 seconds. 

## Adaptability Led to Good Results on Demo Day (Kolby & Marek)
The system was capable of guiding the robot through an unknown, obstacle-filled environment, albeit at a slower average speed than desired. Performance was highly dependent on course difficulty which was variable throughout the length of the demonstrations. Highly parameterized code made it easy to modify and adapt to different courses on the spot. This allowed us to make a high number of course attempts: over 20. 

Of the trial runs that the RACECAR successfully completed, the two fastest times were 8.9 seconds and 11.06 seconds over a 19.45m test course. This is an average speed of 1.97 m/s. The average speed is well above the 1.5 m/s minimum required for credit, yet still well below the 2.5 m/s threshold required for full marks. Despite the wide variance in performance, 8.9s was the fastest time achieved by any team! Figure 11 below shows the 11.06-second run.

<center>
    **Figure 11: Live Run**<br />
    <iframe width="560" height="315" 
            src="https://www.youtube.com/embed/aEMn55uByG8?start=22" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    <br />
_The above figure illustrates the trajectory follower running on the actual RACECAR. With a speed of 1.76 m/s, the RACECAR successfully navigated the 19.45m test course in 11.01 seconds._
</center>

# Lessons Learned: Simplicity and Planning are Key (Kolby)

Our approach illustrated the applicability of simple locally optimal approaches to construct a good solution, even in unknown environments. Our use of the IMU avoided the localization problems faced by other teams. The greedy planner was easy to implement, allowing us to focus on performance improvements instead of debugging.

This lab stressed the importance of advance planning along with simulator and robot testing. Creating a Gantt chart enabled us to track our schedule, progress, and accountability. It illustrated the urgency of implementing the minimum viable product for each subsystem. Simulator testing provided proof-of-concept for algorithms and enabled identification of bugs. RACECAR testing facilitated parameter tuning.

This was a substantial technical challenge which spanned a few weeks. It was crucial that we communicated availabilities to find times to work effectively as a team despite other constraints.  This challenge required a lot of testing and debugging, and it would have been nice to have more time to tune and test our system.

# Future Work (Jerry)

The IRN algorithm used for this challenge is a relatively simple algorithm, but would fail in a more complex environment containing dead ends. For such an environment, SLAM combined with a global path planner would be more appropriate. For a real self-driving car, a greedy path planner remains appropriate in many situations because obstacles are often small and scattered. However, the IRN algorithm would need to be modified to better account for a global path which the car is trying to follow, instead of simply moving in a fixed direction.

# Final Thoughts
The labs of this semester prepared us for the latest of challenges in developing safe and speedy autonomous systems. We thank the RSS Professors and Course Staff -- especially to Professors How and Connor for their detailed feedback every lab -- for making this rewarding experience possible.


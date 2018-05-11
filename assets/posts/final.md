Final Challenge: Fast Collision Avoidance
===

# Abstract (Marek)
The challenge of fast collision avoidance consists of navigating through an unknown environment at high speeds while avoiding randomly placed obstacles. This problem is tackled by using lidar and path planning with IMU-derived orientation.

# Intro (Kolby)
## Overview & Motivation
For the final challenge, we chose to take on the task of fast collision avoidance. We saw this as an exciting opportunity to continue our work with autonomous robots in a challenging and important technical assignment. Driving at high speeds while safely avoiding obstacles, even on a small scale such as this, is a crucial task in the development of self-driving cars and other autonomous vehicles. 
## Proposed Approach 1
We initially hypothesized that SLAM would be essential to simultaneously localize obstacles and create an updated map with these obstacles present. This map would then be given to a path planner, which we believed would be an implementation of RRT. The path planner would produce a path around the obstacles for the robot to execute, and we would employ a safety controller as an added measure to ensure successful collision avoidance. Upon further consideration, however, we concluded that this approach would be unnecessary for this challenge. We determined that, instead of localizing each object, it would be simpler to rely on the LIDAR to find unoccupied space and then use a greedy path planner to drive as far as possible through this unoccupied space.
## Proposed Approach 2
We then hypothesized that this challenge could be reasonably tackled with only IMU data and a path planner based on Dubins curves. Dubins curve is the shortest curve connecting two points assuming the vehicle is traveling forward and with a constraint on its curvature (related to the vehicle's minimum turn radius). The IMU data, which could be obtained directly from the robot, would yield a reasonable estimate for robot orientation. With knowledge of orientation, we would then create paths using Dubins curve through unoccupied space (as determined by the robot's LIDAR) in the lateral direction to the goal region (i.e. forward). Again, as an added safety measure, we would employ a safety controller to correct potential bad decisions by the robot. 
# Design/Algorithm
## Conceptual System Overview (Marek)
Our current fucntioning system consists of three major technical components: path planning, pure pursuit, and safety controller. We use a greedy path planning Ravi*(tm) algorithm that directs us towards the general direcion of the goal point and avoids obstacles as far ahead as the lidar can see. We update this path every time step to dynamically avoid newly discovered obstacles. Pure pursuit, an algorithm that tracks the closest point on a drawn path within a specified lookahead distance, is used to follow these planned paths. Safety controller checks that obstacles ahead of the robot are within safe stopping distance. Otherwise, it will turn the robot away from obstacles if possible and slow it down if necessary. When run simultaneously, these three components ensure we can traverse an obstacle ridden path safely and swiftly. The more specific technical details will be discussed below. 

## Algorithms/Technical Details
### Path Planning Algorithm (Ravi)
The robot dilutes LIDAR data, identifies navigable paths via a greedy algorithm, selects the best path, and publishes it to the Pure Pursuit component. Path planning process involves four components.

1. First, it dilutes the laser scan data into navigable points.
2. Second, it combines orientation updates with  diluated laser data to compute DUBINS paths
3. Third, it rejects non-navigable paths and scores the remaining options
4. Fourth, it send sends the best path to the Pure Pursuit Algorithm

Dilation accounts for the robot’s non-zero size by reducing the raw LIDAR ranges to the maximum distance the robot can safely travel. Without dilation, paths would neglect to account for the RACECAR’s width, resulting in many crashes. Originally, we simply measured the RACECAR’s dimensions, and dilated each laser scan by this constant factor. However, in simulator testing, the robot would still approach obstacles too closely, and occasionally crash, even though the robot could occupy any point on the path without intersecting an obsticle. To correct for the path follower’s error, the dilation amount is scaled proportional to the current speed. This approach is logically coherent, since the path planner is less accurate as the robot travels at higher speeds. As such, it is crucial to return more error-tolerant paths, which this dynamic dilation accomplishes.

On each orientation estimate originating from the IMU, and with the dilated LIDAR data, the RACECAR then computes DUBINS paths. A DUBINS path navigates between two poses via a circular trajectory, followed by a straight-line segment, followed by another circular trajectory. The DUBINS algorithm returns the shortest path subject to a minimum radius for the circular components (which accounts for the non-holonomic nature of the robot). Since paths were computed in the RACECAR frame, the start pose is simply the origin, pointed forward. The end pose would be on the end of the dilated laser range, pointed towards the goal. The IMU orientation updates were used to compute the orientation towards the goal. This approach works because the corridor is straight, so the starting orientation is the same as the goal orientation.

To select the end pose for Dubins Paths, we tried three approaches: greedy, randomized greedy, and uniform. In the greedy approach, the laser ranges with the greatest distance in the direction of the goal were sampled. This approach resulted in nearly identical paths with little variation, since these ranges were very close to each-other. In the greedy-randomized approach, laser ranges were weighted by the distance component in the direction of the goal, and a randomized sample was taken. This approach resulted in slightly more variation than the purely greedy option. However, in the scenario where all poses would require a sharp turn, and that sharp turn would intersect an obsticle, both approaches failed to identify valid paths. As such, we decided on a uniform approach, where end poses were selected over an evenly spaced interval. This approach guaranteed all directions were considered and always returned varying path options.

Each DUBINS path was sampled to determine whether it would be navigable, and the navigable paths were then scored to select the best path to pursue. We rejected paths where any sample on the path would be beyond the dilated laser scan pointed towards the sample. In the event where no paths were found, the algorithm triggers an emergency stop. (Note that, as the robot slows down, the dilation will lessen, so the algorithm will likely find a path on future timesteps). Otherwise, for all navigable paths, we scored them by the path’s distance towards the goal. The path with the highest score is then sent to Pure Pursuit component for navigation.


### Pure Pursuit (Jerry)
Same as before honestly (I asked on piazza if I can refer to a previous paper, tbd...)
### Safety Controller (Kolby)
The safety controller considers potential paths which could be traversed by driving along an arc at a certain speed and angle and then proceeding to drive in a straight line. The controller then determines if the potential paths are safe at the current driving speed, and ultimately sets the robot to drive at the fastest possible speed at an angle which maintains safety.
### SLAM (Sabina)
Simultaneous Localization and Mapping, also known as SLAM, is a computational problem of having a robot build a map of its surroundings while simultaneously trying to find its own position and orientation within this map in real-time. "Localization" involves inferring location given a map, while "Mapping" involves inferring a map given a known location. In other words, a map is needed for localization, but a good pose estimate is needed for mapping. The challenge in SLAM is that the robot must figure out both its pose and map structure while not initially knowing either. 

For our final challenge, our robot needs to quickly and autonomously navigate between two known positions while avoiding unknown obstacles. In our SLAM implementation, we use the particle filter algorithm, or MCL, for localization (described in Lab 5), and Bayes' Rule to update the map's occupancy grid at each laser scan hit (where each location in the grid represents the probability of there existing an obstacle at that point) for mapping.

Bayes' Rule can be stated as:
![](https://cdn-images-1.medium.com/max/1600/1*9YuCNcICo5PW5qqQug6Yqw.png) 
where A and B are events, and P(B) != 0.

## Major Decisions (kolby)
- Abandon SLAM: We ultimately decided not to utilize SLAM for a number of reasons. Google Cartographer was at our disposal, which made SLAM seem appealing, but in reality Google Cartographer would have been too large and slow to serve our purpose. We then resolved to make our own barebones SLAM implementation, but this did not seem terribly promising. Whenever Ravi had the idea to use the IMU to obtain the robot's orientation, which was endorsed by Professor Carlone, we decided to ditch SLAM altogether.
- Use onboard IMU: A large reason for abandoning localization with SLAM is that we suspected IMU data could yield robot orientation to reasonable accuracy. This would suffice for our approach, which essentially was to always move the robot along longest possible unobstructed paths toward the goal; in order to have a concept of "toward the goal," the robot must have knowledge of its orientation.  
- Greedy path planner instead of RRT: Our initial technical plan called for an RRT implementation for path planning. However, we received some important feedback from Professor How regarding path planning. Essentially, since the robot has limited knowledge of what lies behind a frontier of obstacles, it could be too costly to perform RRT every time a newly discovered obstacle deems the path invalid. For the sake of efficiency, we decided to implement a "greedy" path planner which takes the longest unobstructed path based on what the LIDAR sees.
# Implementation
## Path planning (ravi)
W


## Pure pursuit (jerry)
The robot uses a very similar Pure Pursuit trajectory tracker as the one used in previous labs, but with minor changes. Since the robot is no longer running localization, the Pure Pursuit trajectory tracker was integrated with the RahmanNoodle Path Planner, and was adjusted to track trajectories specified in the frame of the robot instead of the map frame. As in previous labs, the algorithm dynamically uses a long lookahead distance of 4.5m if the trajectory is straight ahead, or 1.5m if the path has an angle of at least 0.1 radians. In contrast to previous labs, the algorithm dynamically chooses a drive speed based on the computed steering angle, the drive speed is 4.5 m/s when going straight and linearly decreases to 1.5 m/s at any steering angle at least 0.3 radians.

## Safety controller (jerry)
Aside from small optimizations, implementing the new safety controller had three main challenges: how to select alternative paths the robot may drive along when the original drive direction is unsafe, how to account for the width of the robot in selecting alternative safe paths, and how to ensure the safety controller is able to run in real time. There are innumerable possible alternative paths the robot can drive, and the controller must intelligently explore them in order to select a path which is safe without deviating substantially from the original desired path of the robot, and must return this path within a reasonable timeframe. The controller must only return a path which the robot can drive along without colliding with obstacles, accounting for the width of the robot. Finally, the controller must be careful to publish a drive command in real time, at the same rate that the original drive commands are being published, or else it will not sucessfully override all of the original drive commands.

The algorithm balances between completeness and performance by considering a small, fixed set of possible paths, which are likely to approximate the true optimal path of the robot. The steering angles considered by the robot are a sequence of nine angles, spaced 0.1 radians apart, between the maximum possible steering angles (\\(\pm 0.41\\) radians). For each steering angle, the robot considers stopping the turn after 0.5, 1, and 1.5 arc-radians. The controller finds the steering angle closest to the original desired steering angle such that the robot can safely drive along some path corresponding to that angle, at the original desired speed. If such an angle does not exist, the controller finds the steering angle where the robot can safely drive the fastest. If the controller determines that one of the alternative paths has a higher safe driving speed than the original desired path, the speed of the drive command issued is the safe speed along the chosen alternative path, or the original desired driving speed, whichever is lower.

To account for the width of the robot, the controller verifies that two parallel paths, spaced apart by the width of the robot, are both clear of obstacles. The algorithm samples points along both paths, spaced approximately 0.1 meters apart, and verifies that the laser measurement in the direction of each point exceeds the distance to that point by a safety threshold of 0.2 meters.

In order for the safety controller to run in real time, the controller is limited to only checking the small number of paths described above, everything is written using numpy, and the algorithm also performs some memoization. One of the advantages of using a fixed set of paths is that the coordinates of all the points on the path are fixed. Therefore, the paths can be memoized between different timesteps, allowing the algorithm to spend more time checking if the paths are traversable. This optimization sped up the algorithm by about 30%.

Finally, as a small optimization for path stability, if the safety controller causes the car to drive along an alternative path, it will cache the angle of the issued drive command and issue a command for the same angle for the next three timesteps. This helps avoid behavior where the safety controller causes the robot to swerve back and forth when approaching an obstacle.

## SLAM (sabina)
Updating the occupancy grid based on laser scan hits

At initialization, given our initial map, we initialize all the walls to be at probability 1, and all free spaces to be at 0.5. If the probability of a grid reaches a certain threshold (ie. 0.8), we consider there to be an obstacle within the map. 
 
At each timestep, using laser scan sensor data, we update the probability of each location in the occupancy grid. Given a laser scan hit, if the grid is considered "free" (aka prob < 0.8), we multiply the current probability of the grid with the probability of there being a hit given the grid being free. If the grid is considered "obstacle" (aka prob > 0.8), we multiply the current probability of the grid with the probability of there being a hit given there being an obstacle. 

## ROS Architecture (jerry)
laser, laser adjuster, imu, I think there's a node for managing the imu, greedy planner with inbuilt trajectory tracker, and safety
# Evaluation
## Test Procedures (Marek)
Our ultimate goal for fast collision avoidance is to successfuly navigate through an unknown environment consisting of obstacles of bound widths. The subcomponents of this challenge had to be tested preliminarily in order to achieve this goal. The main components that needed to be tested and improved were path planning and safety controller. Although path planning had previously worked on a static and known map, traversing an unknown environment requires dynamic planning. 

TODO: ravi talk a bit about the testing for this 

Our goal for the safety controller was for it to be able to recognize when we were on a collision course and see whether it was possible to safely avoid the obstacle by turning away. This was tested through simulation: a known map with obstacles was loaded, a path was purposefully drawn through obstacles, and the robot was allowed to drive in order to evaluate whether it would divert away from the obstacles. 

Once our subcomponents were tested and acceptable, the main objective was tested by loading initially through simulation. This was done by launching our map and code containing our previously discussed technical components. A test was deemed succesful if the robot could make it successfully from one end to another without crashing into one of the unknown obstacles. This was initially tested at a slower speed of about 1.5m/s. Once deemed successful, the speed was increased and tested again. If a test was failed, we would search for the bug, attempt to fix the subcomponent in which it occured, and try again. This would be done using RVIZ visualization. We were able to successfully navigate through the test map at 5m/s in simulation, 1.5m/s faster than the speed for the max score. 

Once our simulation testing was complete, we tested in a real life obstacle path. We used RVIZ to visualize the important components of our system for debuggin purposes. We used a similar iterative procedure: we tested at slower speeds and increased our speed as we successfully traveresed the obstacle course (actually need to test is though)

- Real life
- What is being tested?
- How was it tested?
## Outcomes (Unassigned)
- What is the outcome?
- Data to back up the outcome?
- I don't think we need this yet?
## Analyses (Unassigned)
- Any comparisons? Conclusions?
- Also don't think we need this yet?
# Lessons Learned
- Individual technical and communication lessons learned;
- suggestions for improvement
# Future Work
We can probably use an actual path planner in a more complex environment which requires turning around. For computational efficiency we can dynamically switch between the two, using the greedy one normally or falling back to the global path planner if the greedy one fails.


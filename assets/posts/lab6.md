Lab 6
=====

## Abstract - Ravi

Localization -- using sensor data and a map to determine pose (location and orientation) relative to an environment in real time -- enables high-speed path following. When the robot knows its pose, it can calculate its error relative to where it should be headed (e.g. a waypoint), and then move towards it. 

We developed a particle-filter and LIDAR-based localization module. Each particle represents a possible pose of the robot. For each particle, its initial pose and associated probability is drawn from a normal distribution centered at the robot’s known position and orientation. On each timestep, we update the poses of the particles using odometry data and the associated probabilities using LIDAR scan data. Finally, we publish the expected value of the particles as the robot's pose.

We initially tested on the simulator with 2400 particles and 54 laser samples per update at 40hz (\\(\Delta t = 0.025s\\)). We measured absolute average errors of \\(0.043m\\) for position and \\(0.017 rad\\) for orientation against odometry data, which is perfectly accurate in the simulator.

Next, we tested on the actual robot with 4000 particles and 72 laser samples per update at 20hz (\\(\Delta t = 0.05s\\)), the same frequency as the Velodyne LIDAR. We qualitatively measured that our method was accurate for ______ of the 120 second test run (___%).

These accuracy measurements indicate the reliability of particle filter localization and its likely usefulness in path following.
<br />
<br />

## Introduction - Ravi, Kolby, and Sabina

<center><span>![System Diagram](assets/images/lab6/)</span></center>

<center>**Figure 6.1**: *INSERT CAPTION.*</center>

Localization -- the use of sensor data with a map to determine the pose of the robot relative to the environment -- enables high-speed path following. When the robot knows its pose, it can then calculate its error relative to where it should be headed, and adjust its trajectory accordingly. We intend to use path following for the autonomous race. As such, we need fast and accurate localization.

We implemented a particle filter to perform localization. Also known as Monte Carlo Localization (MCL), the particle filter maintains a constant number of weighted “particles” to represent the possible poses of the robot in a given environment. At each timestep, it first uses odometry to intuit the robot's change in position since the last time step. It then uses Laser scans from the LIDAR, along with a map of the environment, to reassess the probability distribution associated with the estimated poses. The most likely pose is extracted from this distribution, and then the whole process repeats.
<br />
<br />

## Particle Filter Algorithm - Sabina

<center><span>![Particle Filter System Diagram](assets/images/lab6/ParticleFilter.png)</span></center>

<center>**Figure 6.2**: *Diagram illustrating components of Particle Filter/Monty Carlo Localization. It first initializes the particles based on known robot location. Then, at each timestep, MCL: 1) Resamples the particles based on the weights computed in the previous timestep, 2) moves each particle's pose using the motion model, and 3) updates each particle's weight using the sensor model.*
</center>

### Initialization
TODO - Sabina

### Resampling

The algorithm samples a new batch of particles based on the weights of the particles computed in the previous timestep. This allows the filter to discard particles deemed to be unlikely, which will not be resampled. Note that the newly resampled particles have uniform weight; the weights in the previous timestep are now reflected in the frequencies of the resampled particles.

### Motion Model

The motion model takes the odometry data from the wheels of the robot, calculates the pose displacement, and applies the displacement as well as random noise to each particle pose. The pose displacement can be calculated by comparing the odometry between the current and previous timesteps. Following a Monte Carlo approach, each particle is translated using this displacement, then perturbed with random noise. See Implementation section for more details.

### Sensor Model

The sensor model updates the particle weights given the collected laser scan data. First, raycast is performed on each particle to determine the ground truth. The ground truth is compared to the actual laser scan data using the sensor model lookup table. The sensor model outputs the probabilities of each particle actually observing the data. By Bayes, since the particles all have uniform probability (due to resampling), this output probability represents the updated weight of each particle. See Implementation section for more implementation details. 
\ 

## Particle Filter Implementation - Jerry

In this section, we discuss areas in which we used our discretion in implementing the particle filter--how we modelled the random noise in the motion and sensor models, how we wrote our code to run efficiently, and how we chose the number of particles and laser measurement samples to use.

### Local Initialization of Particles from Rviz Input

When our algorithm receives an initial pose or initial position from the /initial\_pose or /clicked\_point topics in rviz, we initialize our particles around this pose or point in a normal distribution. The position of the particles are sampled from a normal distribution centered at the received position, with standard deviation 1 meter (chosen arbitrarily). If our algorithm received a pose, the orientation of the particles are sampled from a normal distribution from the received orientation; otherwise, if it only received a point, the orientation of the particles are distributed uniformly in a circle. Initializing our particles in this way makes the initialization of our particle filter robust to errors in the initial point.

### Using Randomness to Account for Noise in Odometry

As a part of the particle filter algorithm, we use a Monte Carlo approach to account for noise in the odometry measurements, in which we use randomness when choosing the distance and angle each particle moves by. For each particle, we independently select the distance to move the particle from a log-normal distribution or normal distribution, and select the angle to rotate the particle from a Gaussian distribution, both centered based on the data from odometry. Once we select the distance and angle to move each particle by, we move the particles by the chosen distance in the direction each particle was previously facing, then we rotate each particle by the chosen angle. See Figure 6.3 for a visualization.

<center><span>![Motion Model](assets/images/lab6/ =800x350)</span></center>

<center>**Figure 6.3: For each particle we draw the distance to move the particle from a log-normal distribution and the angle to rotate the particle from a normal-distribution, with parameters selected based on the odometry sensor data (see below). Each particle is translated by the selected distance in the direction the particle was facing, and then rotated by the selected angle.**</center>

We draw the distance to move each particle from a log-normal distribution if the odometry data indicates the robot is moving, or from a normal distribution if the odometry data indicates the robot is standing still. This is because we expect that if the odometry indicates the robot is moving forward, the robot is unlikely to actually be moving backwards; a log-normal distribution has no probability mass less than zero, reflecting this property. We determine the direction the robot is moving by comparing the direction of movement reported by the odometry to the robot's facing angle determined by the odometry. The formulas we use to determine the distance to move each particle are in Figure 6.4.

<center><span>![Distance Formulas](assets/images/lab6/DistanceFormulas.png =800x350)</span></center>

<center>**Figure 6.4: How we draw the distances \\(d\\) to move each particle from the odometry data. The odometry data provides us with a pose \\((x, y, \theta)\\) (computed from dead reckoning) and a covariance matrix \\(\Sigma\\). From the pose, we compute \\(\Delta x, \Delta y\\), the differences in the \\(x\\) and \\(y\\) coordinates from the previous reported pose. These allow us to determine the direction and distance of movement, and we estimate the noise using \\(\Sigma\\). We then draw the distances to move each particle based on these computations.**</center>

We draw the angle to rotate each particle simply from a normal distribution centered on the angle change reported by the odometry, with standard deviation given by the covariance matrix reported by the odometry, but increased by a factor of 1.5 (which we determined testing with the autograder). However, sometimes this noise is too much; we clamp the standard deviation of the Gaussian with an upper bound of 0.5 radians, chosen so that it is very improbable for the noise to be \\(\pi\\), which can cause the inferred pose to spontaneously reverse direction in the middle of a long hallway.

### Accounting for Laser Scan Noise with our Sensor Model

Following the lab handout, we construct a 4-part sensor model to specify the probability of measuring a distance \\(r\\) with the laser given a ground truth distance \\(d\\), because noise or unexpected obstacles can cause the laser to not report the true distance.

   1. We represent the possibility that the laser may measure the correct distance, but with some noise, using a Gaussian centered at \\(d\\), of standard deviation 4 pixels (about 20cm).
   2. We represent the possibility the laser may hit an intervening unknown obstacle, with a sloped line where the probability of measuring distance 0 is half the peak height of the Gaussian in part 1, and the probability decreases linearly to 0 at the ground truth distance \\(d\\).
   3. We represent the possibility the laser may miss or reflect, assigning a probability \\(0.08\\) to the maximum possible measurement. 
   4. We represent the possibility of a random measurement, assigning a total probability of \\(0.05\\) to this case.

We add all these components together to compute the total probability of measuring a distance \\(r\\). This probability is then "squashed" to the power of 12/num\_laser\_samples, where num\_laser\_samples is the number of laser measurements we make from each particle, which comes out to about \\(\frac{1}{6}\\). This is so that if we take many laser measurements which all report related errors, e.g. due to many laser measurements hitting an unexpected obstacle, it does not too strongly impact our particle weights. All parameters used in our sensor model were hand-tuned to optimize for score on the autograder.

<center><span>![Sensor Model Visualization](assets/images/lab6/ =800x500)</span></center>

<center>**Figure 6.5: INSERT CAPTION.**</center>

### Efficient Implementation with RangeLibC on the GPU

We used the rangelibc library with GPU enabled to write an efficient implementation of the particle filter, allowing us to support larger numbers of particles and take more laser samples in real time. In our original implementation, we used the calc\_range\_repeat\_angles function from rangelibc in order to perform fast raycasting, and we precomputed the sensor model and used rangelibc's eval\_sensor\_model function to evaluate the sensor model very quickly. Even so, we found our code was slower than we wanted, and we were only able to support about 1000 particles at 40 Hz. We tried to run cProfile to determine where the bottleneck was in our code, but it reported only that most of the time was spent asleep, and did not report any useful information. Instead, we manually used Python's time.time() function to determine how long we spent on each portion of the code, and realized the bulk of our time was spent raycasting. We switched the range method from cddt to rmgpu, so that rangelibc would take advantage of the GPU on the robot, which sped our code up enough to support 2400 particles at 40Hz, though raycasting is still the slowest part of our code.

### Number of Particles vs Laser Scans

There is a performance tradeoff where using more particles or sampling more laser measurements gives better results from the particle filter at the cost of speed; we chose how many particles and sampled laser measurements to use to maximize empirical accuracy at the minimum required speed. The time cost of raycasting, which is the slowest component of our code, is proportional to the number of particles times the number of laser samples. When a slight error in the robot position can cause a big difference in the laser measurements, for example when there are complex obstacles arranged close together, it is important to use many particles to get as close to the true position as possible. Conversely, when there are relatively few features such as in a hallway, it is important to take many laser measurements in order to see these features so that the robot can determine which particles are the most likely. Originally, we tuned the particles \\(\times\\) laser measurements to run at 40Hz on the autograder, then tried different ratios of particles to laser measurements, and found that 2400 particles and 54 laser measurement samples performs the best on the autograder. When we moved to working on the robot, because the Velodyne laser scanner only publishes at 20Hz, we were able to increase the number of particles to 4000 and number of laser samples to 72; these numbers were chosen to keep the proportions similar to those on the autograder and were not tuned.


## Evaluation - Ravi

<center>[![Particle Filter Simulator](assets/images/lab6/ =600x400)]( "Particle Filter in Simulation")</center>

<center>**Figure 6.6: The above video shows our particle filter localization running at 10hz in a simulated environment. Red represents the inferred odometry; green represents the ground truth. The overlap illustrates the high level of accuracy of our implementation (average absolute error at each timestep: 0.093m)**</center>

We first evaluated our particle filter on the simulator, where the ground truth odometry is perfectly accurate. Hence, at each timestep, we could compute the absolute difference between the inferred pose and the actual pose.

When running at 10 hz with 4000 particles and 72 laser samples per timestep, we recorded error of:
   - Position: \\(0.092m\\)
   - Orientation: \\(0.0275 rad\\)
   
We then increased the frequency to 40 hz and reduced the number of particles and laser samples to 2400 and 54, respectively, per update. This reduced absolute average error to:
   - Position: \\(0.043m\\)
   - Orientation: \\(0.017 rad\\)

Because these low error measurements would support path following, we did not attempt to optimize further. 

<center>[![Particle Filter Robot](assets/images/lab6/ =600x400)](https:// "Particle Filter on Robot")</center>

<center>**Figure 6.7: The above video shows our particle filter algorithm running on the robot at 20 hz with 72 laser samples per update and 4000 particles. The red path represents the inferred poses while the white dots represent laser scans. We qualitatively determined the filter was accurate for __ of the 120 seconds (__%).**</center>

We then tested particle filter running at 20hz with 72 laser samples per update and 4000 particles on the actual robot. Unlike the simulator, we lacked a perfectly-accurate ground truth, so we could not quantitatively compute error. Instead, we quantitatively measured that our method was qualitatively accurate for ______ of the 120 second test run (___%).

These accuracy measurements indicate the reliability of particle filter localization and its likely usefulness in path following.

## Lessons Learned - Kolby, Marek

This lab required much tuning and testing, so most of our conclusions resonate along those lines. For starters, we found that noise could be tricky to introduce into our model and had to be done so appropriately. Introducing too little or too much noise had direct implications on our performance, such as being unable to recover after getting slightly off track or spontaneously turning around in the middle of a hallway. Related to this, when the laser data is noisy, it is important that the motion model is correct; when the laser data is noisy and the motion model is not correct, the inferred position can be wildly unpredictable, especially in the presence of unmapped obstacles. 

When it comes to testing, instrumentation and thinking deeply about how the code works is more effective than blindly changing parameters. A lot of time was spent arbitrarily changing parameters and running the simulation to see the change's effect, but it was not until we stopped to think about the code that considerable progress was made. Also when testing, it is important to understand the testing procedure. For example, the rosbags that we first collected ended up not being useful because we neglected to record the robot's starting location.

## Future Work - Marek

As is usually the case with coding and algorithms, we can strive to make our particle filter algorithm more efficient. We tried to vectorize as much as we could with numpy, but there were still some sections that we had to implement relatively inefficiently using for-loops. Additionally, our models for noise are a bit hacky. We added noise to our motion model using a Gaussian, the parameters of which were essentially guess-and-checked. Furthermore we took the lognormal of these values which resulted in a mean that was slightly off. In the future we would like to experiment with potentially more reasonable methods of factoring noise into our model. Finally, as mentioned earlier, we sometimes had sporadic behavior when the robot encountered an unmapped obstacle; detecting unmapped obstacles or deviations from the actual map is a challenge we would like to solve in order to improve our robot's performance.
